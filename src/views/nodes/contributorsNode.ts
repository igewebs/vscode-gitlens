import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from 'vscode';
import type { GitUri } from '../../git/gitUri';
import { GitContributor } from '../../git/models/contributor';
import type { Repository } from '../../git/models/repository';
import { configuration } from '../../system/configuration';
import { gate } from '../../system/decorators/gate';
import { debug } from '../../system/decorators/log';
import { timeout } from '../../system/decorators/timeout';
import type { ViewsWithContributorsNode } from '../viewBase';
import { MessageNode } from './common';
import { ContributorNode } from './contributorNode';
import { ContextValues, getViewNodeId, ViewNode } from './viewNode';

export class ContributorsNode extends ViewNode<ViewsWithContributorsNode> {
	protected override splatted = true;

	constructor(
		uri: GitUri,
		view: ViewsWithContributorsNode,
		protected override readonly parent: ViewNode,
		public readonly repo: Repository,
	) {
		super(uri, view, parent);

		this.updateContext({ repository: repo });
		this._uniqueId = getViewNodeId('contributors', this.context);
	}

	override get id(): string {
		return this._uniqueId;
	}

	get repoPath(): string {
		return this.repo.path;
	}

	private _children: ContributorNode[] | undefined;

	async getChildren(): Promise<ViewNode[]> {
		if (this._children == null) {
			const all = configuration.get('views.contributors.showAllBranches');

			let ref: string | undefined;
			// If we aren't getting all branches, get the upstream of the current branch if there is one
			if (!all) {
				try {
					const branch = await this.view.container.git.getBranch(this.uri.repoPath);
					if (branch?.upstream?.name != null && !branch.upstream.missing) {
						ref = '@{u}';
					}
				} catch {}
			}

			const stats = configuration.get('views.contributors.showStatistics');

			const contributors = await this.repo.getContributors({ all: all, ref: ref, stats: stats });
			if (contributors.length === 0) return [new MessageNode(this.view, this, 'No contributors could be found.')];

			GitContributor.sort(contributors);
			const presenceMap = await this.maybeGetPresenceMap(contributors);

			this._children = contributors.map(
				c =>
					new ContributorNode(this.uri, this.view, this, c, {
						all: all,
						ref: ref,
						presence: presenceMap,
					}),
			);
		}

		return this._children;
	}

	getTreeItem(): TreeItem {
		this.splatted = false;

		const item = new TreeItem('Contributors', TreeItemCollapsibleState.Collapsed);
		item.id = this.id;
		item.contextValue = ContextValues.Contributors;
		item.iconPath = new ThemeIcon('organization');
		return item;
	}

	updateAvatar(email: string) {
		if (this._children == null) return;

		for (const child of this._children) {
			if (child.contributor.email === email) {
				void child.triggerChange();
			}
		}
	}

	@gate()
	@debug()
	override refresh() {
		this._children = undefined;
	}

	@debug({ args: false })
	@timeout(250)
	private async maybeGetPresenceMap(contributors: GitContributor[]) {
		// Only get presence for the current user, because it is far too slow otherwise
		const email = contributors.find(c => c.current)?.email;
		if (email == null) return undefined;

		return this.view.container.vsls.getContactsPresence([email]);
	}
}
