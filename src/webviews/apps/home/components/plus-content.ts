import { attr, css, customElement, FASTElement, html, volatile, when } from '@microsoft/fast-element';
import { SubscriptionState } from '../../../../subscription';
import { pluralize } from '../../../../system/string';
import { numberConverter } from '../../shared/components/converters/number-converter';
import '../../shared/components/codicon';

const template = html<PlusContent>`
	${when(
		x => x.state === SubscriptionState.Free,
		html<PlusContent>`
			<p>Adds all-new, completely optional, features that enhance your GitLens experience.</p>
			<p>These features are free for local and public repos, no account required.</p>

			<p class="mb-1">
				<vscode-button @click="${x => x.fireAction('command:gitlens.plus.startPreviewTrial')}"
					>Try GitLens+ Pro for private repos</vscode-button
				>
			</p>
			<p>
				<a class="minimal" href="command:gitlens.plus.hide">Hide GitLens+ features</a>
			</p>
		`,
	)}
	${when(
		x => x.state === SubscriptionState.Paid,
		html<PlusContent>`
			<h3>Welcome to ${x => x.planName}!</h3>
			<p>
				You have access to
				<a title="Learn more about GitLens+ features" href="command:gitlens.plus.learn">GitLens+ features</a>
				on any repo.
			</p>
		`,
	)}
	${when(
		x => [SubscriptionState.FreeInPreviewTrial, SubscriptionState.FreePlusInTrial].includes(x.state),
		html<PlusContent>`
			<h3>GitLens Pro Trial</h3>
			<p>
				You have ${x => x.daysRemaining} left in your
				<a title="Learn more about GitLens+ features" href="command:gitlens.plus.learn">GitLens Pro trial</a>.
				Once your trial ends, you'll continue to have access to GitLens+ features on local and public repos,
				while private repo access will need GitLens Pro.
			</p>
		`,
	)}
	${when(
		x => x.state === SubscriptionState.FreePreviewTrialExpired,
		html<PlusContent>`
			<h3>Extend Your GitLens Pro Trial</h3>
			<p>
				Your free 3-day GitLens Pro trial has ended, extend your trial to get an additional 7-days of GitLens+
				features on private repos.
			</p>
			<p class="mb-1">
				<vscode-button @click="${x => x.fireAction('command:gitlens.plus.loginOrSignUp')}"
					>Extend Trial</vscode-button
				>
			</p>
		`,
	)}
	${when(
		x => x.state === SubscriptionState.FreePlusTrialExpired,
		html<PlusContent>`
			<h3>GitLens Pro Trial Expired</h3>
			<p>
				Your GitLens Pro trial has ended, please upgrade to GitLens Pro to continue to use GitLens+ features on
				private repos.
			</p>
			<p class="mb-1">
				<vscode-button @click="${x => x.fireAction('command:gitlens.plus.purchase')}"
					>Upgrade to Pro</vscode-button
				>
			</p>
		`,
	)}
	${when(
		x => x.state === SubscriptionState.VerificationRequired,
		html<PlusContent>`
			<h3>Please verify your email</h3>
			<p class="alert__message">
				Before you can also use GitLens+ features on private repos, please verify your email address.
			</p>
			<p class="mb-1">
				<vscode-button @click="${x => x.fireAction('command:gitlens.plus.resendVerification')}"
					>Resend Verification Email</vscode-button
				>
			</p>
			<p class="mb-1">
				<vscode-button @click="${x => x.fireAction('command:gitlens.plus.validate')}"
					>Refresh Verification Status</vscode-button
				>
			</p>
		`,
	)}

	<p class="mb-0"><code-icon icon="info"></code-icon> All other GitLens features are always accessible</p>
`;

const styles = css`
	* {
		box-sizing: border-box;
	}

	:host {
		display: block;
		text-align: center;
	}

	a {
		color: var(--vscode-textLink-foreground);
		text-decoration: none;
	}
	a:focus {
		outline-color: var(--focus-border);
	}
	a:hover {
		text-decoration: underline;
	}

	p {
		margin-top: 0;
	}

	.mb-1 {
		margin-bottom: 0.4rem;
	}
	.mb-0 {
		margin-bottom: 0;
	}

	.minimal {
		color: var(--color-foreground--50);
	}
`;

@customElement({ name: 'plus-content', template: template, styles: styles })
export class PlusContent extends FASTElement {
	@attr({ converter: numberConverter })
	days = 0;

	@attr({ converter: numberConverter })
	state: SubscriptionState = SubscriptionState.Free;

	@attr
	plan = '';

	@attr
	visibility: 'local' | 'public' | 'mixed' | 'private' = 'public';

	get daysRemaining() {
		if (this.days < 1) {
			return 'less than one day';
		}
		return pluralize('day', this.days);
	}

	get isFree() {
		return ['local', 'public'].includes(this.visibility);
	}

	@volatile
	get planName() {
		switch (this.state) {
			case SubscriptionState.Free:
			case SubscriptionState.FreePreviewTrialExpired:
			case SubscriptionState.FreePlusTrialExpired:
				return 'GitLens Free';
			case SubscriptionState.FreeInPreviewTrial:
			case SubscriptionState.FreePlusInTrial:
				return 'GitLens Pro (Trial)';
			case SubscriptionState.VerificationRequired:
				return `${this.plan} (Unverified)`;
			default:
				return this.plan;
		}
	}

	fireAction(command: string) {
		this.$emit('action', command);
	}
}
