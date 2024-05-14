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
      this.datum = this.formatDate(this.getAttribute('datum'));
      this.url = this.getAttribute('url');
      this.status = this.getAttribute('status');
      this.approved = ['Goedgekeurd', 'Behandeld'].includes(this.getAttribute('status'));;
      this.innerHTML += this.createDetail();
    }
  }

  createDetail() {
    return (`
      <div class="cs--blue">
        <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Fira+Sans:400,600,700">
        <link rel="stylesheet" href="https://stijlgids.stad.gent/v6/css/styleguide.css">
        <link rel="stylesheet" href="https://stijlgids.stad.gent/v6/css/main.css">
        <link rel="stylesheet" href="https://stadgent.github.io/js_widget-besluiten/besluiten-detail/besluiten-detail.css">
        <div class="resolutions-detail">
          <div class="resolutions-detail__title">
            <a href="${this.url}" class="resolutions-detail__link">${this.titel}</a>
          </div>
          <dl class="resolutions-detail__list">
            <dt>Orgaan:</dt>
            <dd>${this.orgaan}</dd>
            <dt>Datum van de zitting:</dt>
            <dd>${this.datum}</dd>
          </dl>
          <span class="resolutions-detail__status resolutions-detail__status--${this.approved ? 'true' : 'false'}" >${this.status}</span>
        </div>
      </div>
    `);
  }

  renderResults(besluit) {
    this.titel = besluit.title.value;
    this.orgaan = '@todo';
    this.datum = this.formatDate(besluit.date.value)
    this.url = besluit.url.value;
    this.status = besluit.status.value;
    this.approved = besluit.status.value == 'Goedgekeurd';
    this.innerHTML += this.createDetail();
  }

  formatDate(date) {
    date = new Date(date);
    let d = date.toLocaleDateString('nl-be', {
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    let t = date.toLocaleTimeString('nl-be', {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    });
    return `${d} om ${t}`;
  }

  async getBesluit(uri) {
    const query = this.constructQuery(uri);
    const endpoint = this.getAttribute('sparql-endpoint') + "?query=" + encodeURIComponent(query);
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
    
    SELECT ?title ?date ?url ?status WHERE {
      <${uri}> a besluit:Besluit ;
        eli:date_publication ?date ;
        eli:title_short ?title ;
        prov:wasGeneratedBy/besluit:heeftStemming/besluit:gevolg ?status ;
        prov:wasDerivedFrom ?url .
    } LIMIT 1`
  }

}

customElements.define('besluiten-detail', BesluitenDetail);
