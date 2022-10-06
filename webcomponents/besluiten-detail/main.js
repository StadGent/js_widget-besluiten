class BesluitenDetail extends HTMLElement {

  constructor() {
    super();
  }

  connectedCallback() {
    if (this.getAttribute('uri')) {
      this.getBesluit(this.getAttribute('uri'));
    } else {
      this.titel = this.getAttribute('titel');
      this.orgaan = this.getAttribute('orgaan');
      this.datum = this.getAttribute('datum');
      this.url = this.getAttribute('url');
      this.status = this.getAttribute('status');
      this.innerHTML += this.createDetail();
    }
  }

  createDetail() {
    return (`
        <div class="besluiten-list__item besluiten-list__item--${this.status}">
          <h3 class="besluiten-list__item-title">
            <a href="${this.url}" class="besluiten-list__item-link">${this.titel}</a>
          </h3>
          <p class="besluiten-list__item-content">
            <span>Orgaan: ${this.orgaan}</span>
            <span>Goedkeuring: ${this.datum}</span>
          </p>
          <span class="besluiten-list__item-status">${this.status}</span>
        </div>
    `);
  }

  renderResults(besluit) {
    console.log(besluit);
    this.titel = besluit.title.value;
    this.orgaan = '@todo';
    this.datum = this.getAttribute('datum');
    var zitting = besluit.zitting.value;
    zitting = zitting.substr(zitting.length - 17);
    var agendapunt = besluit.agendapunt.value;
    agendapunt = agendapunt.substr(agendapunt.length - 17);
    this.url = `https://ebesluitvorming.gent.be/zittingen/${zitting}/agendapunten/${agendapunt}`;
    this.status = '@todo';
    this.innerHTML += this.createDetail();
  }

  async getBesluit(uri) {
    const query = this.constructQuery(uri);
    const endpoint = this.getAttribute('endpoint') + "?query=" + encodeURIComponent(query);
    const response = await fetch(endpoint,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/sparql-results+json'
          }
        });

    if (response.ok) {
      const json = await response.json();
      if (json.results.bindings && json.results.bindings.length > 0) {
        //console.log(JSON.stringify(json.results.bindings));
        this.renderResults(json.results.bindings[0]);
      } else {
        console.log("Error when getting data.");
      }
    } else {
      console.log("Error when getting data.");
    }
  }

  constructQuery(uri) {
    return `
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX prov: <http://www.w3.org/ns/prov#>
    PREFIX eli: <http://data.europa.eu/eli/ontology#>
    PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
    
    SELECT ?title ?date ?agendapunt ?zitting WHERE {
      <${uri}> a besluit:Besluit ;
        eli:date_publication ?date ;
        eli:title_short ?title ;
        prov:wasGeneratedBy/dct:subject ?agendapunt .
    
      ?zitting besluit:behandelt ?agendapunt .
    } LIMIT 1`
  }

}

customElements.define('besluiten-detail', BesluitenDetail);
