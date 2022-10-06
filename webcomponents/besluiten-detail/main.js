class BesluitenDetail extends HTMLElement {

  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML += this.createDetail();
  }

  createDetail() {
    const titel = this.getAttribute('titel');
    const orgaan = this.getAttribute('orgaan');
    const datum = this.getAttribute('datum');
    const url = this.getAttribute('url');
    const status = this.getAttribute('status');

    return (`
        <div class="besluiten-list__item besluiten-list__item--${status}">
          <h3 class="besluiten-list__item-title">
            <a href="${url}" class="besluiten-list__item-link">${titel}</a>
          </h3>
          <p class="besluiten-list__item-content">
            <span>Orgaan: ${orgaan}</span>
            <span>Goedkeuring: ${datum}</span>
          </p>
          <span class="besluiten-list__item-status">${status}</span>
        </div>
    `);
  }

}

customElements.define('besluiten-detail', BesluitenDetail);
