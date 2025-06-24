import type { UmbStaticFileItemModel } from '../../repository/item/types.js';
import { UmbStaticFilePickerInputContext } from './input-static-file.context.js';
import { css, customElement, html, nothing, property, repeat, state, when } from '@umbraco-cms/backoffice/external/lit';
import { splitStringToArray } from '@umbraco-cms/backoffice/utils';
import { umbConfirmModal } from '@umbraco-cms/backoffice/modal';
import { UmbChangeEvent } from '@umbraco-cms/backoffice/event';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import { UmbFormControlMixin } from '@umbraco-cms/backoffice/validation';
import { UmbServerFilePathUniqueSerializer } from '@umbraco-cms/backoffice/server-file-system';

@customElement('umb-input-static-file')
export class UmbInputStaticFileElement extends UmbFormControlMixin<string | undefined, typeof UmbLitElement>(
	UmbLitElement,
) {
	#pickerContext = new UmbStaticFilePickerInputContext(this);

	#serializer = new UmbServerFilePathUniqueSerializer();

	/**
	 * This is a minimum amount of selected files in this input.
	 * @type {number}
	 * @attr
	 * @default
	 */
	@property({ type: Number })
	public set min(value: number) {
		this.#pickerContext.min = value;
	}
	public get min(): number {
		return this.#pickerContext.min;
	}

	/**
	 * Min validation message.
	 * @type {boolean}
	 * @attr
	 * @default
	 */
	@property({ type: String, attribute: 'min-message' })
	minMessage = 'This field need more files';

	/**
	 * This is a maximum amount of selected files in this input.
	 * @type {number}
	 * @attr
	 * @default
	 */
	@property({ type: Number })
	public set max(value: number) {
		this.#pickerContext.max = value;
	}
	public get max(): number {
		return this.#pickerContext.max;
	}

	/**
	 * Max validation message.
	 * @type {boolean}
	 * @attr
	 * @default
	 */
	@property({ type: String, attribute: 'min-message' })
	maxMessage = 'This field exceeds the allowed amount of files';

	public set selection(paths: Array<string>) {
		this.#pickerContext.setSelection(paths);
	}
	public get selection(): Array<string> {
		return this.#pickerContext.getSelection();
	}

	@property({ type: String })
	public override set value(selectionString: string | undefined) {
		this.selection = splitStringToArray(selectionString);
	}
	public override get value(): string | undefined {
		return this.selection.length > 0 ? this.selection.join(',') : undefined;
	}

	@property()
	public pickableFilter?: (item: UmbStaticFileItemModel) => boolean;

	@state()
	private _items?: Array<UmbStaticFileItemModel>;

	@state()
	private _invalidData?: Array<string>;

	constructor() {
		super();

		this.addValidator(
			'rangeUnderflow',
			() => this.minMessage,
			() => !!this.min && this.#pickerContext.getSelection().length < this.min,
		);

		this.addValidator(
			'rangeOverflow',
			() => this.maxMessage,
			() => !!this.max && this.#pickerContext.getSelection().length > this.max,
		);

		this.observe(this.#pickerContext.selection, (selection) => (this.value = selection.join(',')));
		this.observe(this.#pickerContext.selectedItems, (selectedItems) => (this._items = selectedItems));
		this.observe(this.#pickerContext.statuses, (statuses) => {
			this._invalidData = statuses.filter((x) => x.state.type === 'error').map((x) => x.unique);
		});
	}

	protected override getFormElement() {
		return undefined;
	}

	#openPicker() {
		this.#pickerContext.openPicker({
			pickableFilter: this.pickableFilter,
			multiple: this.max === 1 ? false : true,
			hideTreeRoot: true,
		});
	}

	async #onRemoveInvalidData() {
		await umbConfirmModal(this, {
			color: 'danger',
			headline: '#contentPicker_unsupportedRemove',
			content: '#defaultdialogs_confirmSure',
			confirmLabel: '#actions_remove',
		});

		this.value = undefined;
		this._invalidData = undefined;
		this.dispatchEvent(new UmbChangeEvent());
	}

	override render() {
		return when(
			!this._invalidData?.length,
			() => html`${this.#renderItems()}${this.#renderAddButton()}`,
			() => html`${this.#renderInvalidData()}`,
		);
	}

	#renderAddButton() {
		if (this.max === 1 && (this._items?.length ?? 0) >= this.max) return;
		return html`
			<uui-button
				id="btn-add"
				look="placeholder"
				@click=${this.#openPicker}
				label=${this.localize.term('general_choose')}></uui-button>
		`;
	}

	#renderItems() {
		if (!this._items) return nothing;
		return html`
			<uui-ref-list>
				${repeat(
					this._items,
					(item) => item.unique,
					(item) => this.#renderItem(item),
				)}
			</uui-ref-list>
		`;
	}

	#renderItem(item: UmbStaticFileItemModel) {
		if (!item.unique) return nothing;
		return html`
			<uui-ref-node name=${item.name} .detail=${this.#serializer.toServerPath(item.unique) || ''}>
				<uui-action-bar slot="actions">
					<uui-button
						label=${this.localize.term('general_remove')}
						@click=${() => this.#pickerContext.requestRemoveItem(item.unique)}></uui-button>
				</uui-action-bar>
			</uui-ref-node>
		`;
	}

	#renderInvalidData() {
		if (!this._invalidData?.length) return nothing;
		return html`
			<div id="messages">
				${repeat(
					this._invalidData,
					(item) => item,
					(item) => html`
						<p>
							<umb-localize key="contentPicker_unsupportedHeadline">
								<strong>Unsupported content items</strong><br />
								The following content is no longer supported in this editor.
							</umb-localize>
						</p>
						<ul>
							<li>${this.#serializer.toServerPath(item)}</li>
						</ul>
						<p>
							<umb-localize key="contentPicker_unsupportedMessage">
								If you still require this content, please contact your administrator. Otherwise you can remove it.
							</umb-localize>
						</p>
						<uui-button
							color="danger"
							look="outline"
							label=${this.localize.term('contentPicker_unsupportedRemove')}
							@click=${this.#onRemoveInvalidData}></uui-button>
					`,
				)}
			</div>
		`;
	}

	static override styles = [
		css`
			#btn-add {
				width: 100%;
			}

			#messages {
				color: var(--uui-color-danger-standalone);
			}
		`,
	];
}

export default UmbInputStaticFileElement;

declare global {
	interface HTMLElementTagNameMap {
		'umb-input-static-file': UmbInputStaticFileElement;
	}
}
