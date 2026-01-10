const html = String.raw;
class TestComponent extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.classList.add('test-component');
        this.innerHTML = html`<div>Test Component Loaded</div>`;
    }
}
customElements.define('test-component', TestComponent);
export default TestComponent;
