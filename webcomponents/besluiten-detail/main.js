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

  async getReglement() {
    const endpoint = this.getAttribute('endpoint') + "?query=" + encodeURIComponent(this.constructQuery());
    const response = await fetch(endpoint,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/sparql-results+json'
          }
        });

    if (response.ok) {
      const json = await response.json();
      console.log(JSON.stringify(json.results.bindings));
      this.renderResults(json.results.bindings);
    } else {
      console.log("Error when getting data.");
    }
  }

  constructQuery() {
    return `PREFIX eli: <http://data.europa.eu/eli/ontology#>
    PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
    
    SELECT ?besluit ?title ?date WHERE {
      ?besluit a besluit:Besluit ;
        eli:date_publication ?date ;
        eli:title_short ?title .
    } ORDER BY DESC(?date) LIMIT 5`
  }

}

customElements.define('besluiten-detail', BesluitenDetail);
