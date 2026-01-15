const html = String.raw;
class TestComponent2 extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.classList.add('test-component');
        this.innerHTML = html`<div>Test Component Loaded</div>`;
        console.log('TestComponent2 Loaded');
    }
}
customElements.define('test-component2', TestComponent2);
export default TestComponent2;
