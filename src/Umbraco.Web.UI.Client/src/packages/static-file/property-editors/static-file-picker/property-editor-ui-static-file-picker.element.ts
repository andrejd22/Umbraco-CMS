import type { UmbInputStaticFileElement } from '../../components/index.js';
import type {
	UmbPropertyEditorUiElement,
	UmbPropertyEditorConfigCollection,
} from '@umbraco-cms/backoffice/property-editor';
import { customElement, html, property, state } from '@umbraco-cms/backoffice/external/lit';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import type { UmbNumberRangeValueType } from '@umbraco-cms/backoffice/models';
import '../../components/input-static-file/index.js';
import { UmbServerFilePathUniqueSerializer } from '@umbraco-cms/backoffice/server-file-system';
import { UmbChangeEvent } from '@umbraco-cms/backoffice/event';

@customElement('umb-property-editor-ui-static-file-picker')
export class UmbPropertyEditorUIStaticFilePickerElement extends UmbLitElement implements UmbPropertyEditorUiElement {
	#singleItemMode = false;
	// TODO: get rid of UmbServerFilePathUniqueSerializer in v.15 [NL]
	#serverFilePathUniqueSerializer = new UmbServerFilePathUniqueSerializer();

	@state()
	private _value?: string | Array<string>;

	@property({ attribute: false })
	public set value(value: string | Array<string> | undefined) {
		if (Array.isArray(value)) {
			this._value = value.map((unique) => this.#serverFilePathUniqueSerializer.toUnique(unique));
		} else if (value) {
			this._value = this.#serverFilePathUniqueSerializer.toUnique(value);
		} else {
			this._value = undefined;
		}
	}
	public get value(): string | Array<string> | undefined {
		if (Array.isArray(this._value)) {
			return this._value.map((unique) => this.#serverFilePathUniqueSerializer.toServerPath(unique) ?? '');
		} else if (this._value) {
			return this.#serverFilePathUniqueSerializer.toServerPath(this._value) ?? '';
		} else {
			return undefined;
		}
	}

	public set config(config: UmbPropertyEditorConfigCollection | undefined) {
		this.#singleItemMode = config?.getValueByAlias<boolean>('singleItemMode') ?? false;
		const validationLimit = config?.getValueByAlias<UmbNumberRangeValueType>('validationLimit');

		this._limitMin = validationLimit?.min ?? 0;
		this._limitMax = this.#singleItemMode ? 1 : (validationLimit?.max ?? Infinity);
	}

	@state()
	private _limitMin: number = 0;
	@state()
	private _limitMax: number = Infinity;

	#onChange(event: CustomEvent & { target: UmbInputStaticFileElement }) {
		this._value = this.#singleItemMode ? event.target.selection[0] : event.target.selection;
		this.dispatchEvent(new UmbChangeEvent());
	}

	// TODO: Implement mandatory?
	override render() {
		return html`
			<umb-input-static-file
				.selection=${this._value ? (Array.isArray(this._value) ? this._value : [this._value]) : []}
				.min=${this._limitMin ?? 0}
				.max=${this._limitMax ?? Infinity}
				@change=${this.#onChange}>
			</umb-input-static-file>
		`;
	}
}

/** @deprecated Should be exported as `element` only; to be removed in Umbraco 18. */
export default UmbPropertyEditorUIStaticFilePickerElement;

export { UmbPropertyEditorUIStaticFilePickerElement as element };

declare global {
	interface HTMLElementTagNameMap {
		'umb-property-editor-ui-static-file-picker': UmbPropertyEditorUIStaticFilePickerElement;
	}
}
