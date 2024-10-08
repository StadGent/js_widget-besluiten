class ReglementenDetail extends HTMLElement {

  constructor() {
    super();
  }

  connectedCallback() {
    if (this.getAttribute('uri')) {
      this.getReglement(this.getAttribute('uri'));
    } else {
      this.titel = this.getAttribute('titel');
      this.orgaan = this.getAttribute('orgaan');
      this.datum = this.formatDate(this.getAttribute('datum'));
      this.url = this.getAttribute('url');
      this.type = this.getAttribute('type');
      this.status = this.getAttribute('status');
      this.status_green = ['Aanvaard tot de zitting als hoogdringend agendapunt', 'Goedgekeurd', 'Behandeld'].includes(this.getAttribute('status'));;
      this.status_red = ['Afgekeurd', 'Afgevoerd', 'Geweigerd', 'Ingetrokken'].includes(this.getAttribute('status'));;
      this.status_na = ['Gedeeltelijke ingetrokken', 'Verdaagd'].includes(this.getAttribute('status'));;
      this.innerHTML += this.createDetail();
    }
  }

  createDetail() {
    return (`
      <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Fira+Sans:400,600,700">
      <link rel="stylesheet" href="https://stijlgids.stad.gent/v6/css/styleguide.css">
      <link rel="stylesheet" href="https://stijlgids.stad.gent/v6/css/main.css">
      <link rel="stylesheet" href="https://stadgent.github.io/js_widget-besluiten/besluiten-detail/besluiten-detail.css">
      
      <div class="reglementen-detail teaser">
        <div class="reglementen-detail__title">
          <a href="${this.url}" class="resolutions-detail__link">${this.titel}</a>
        </div>
        <dl class="reglementen-detail__list">
          <dt>Orgaan:</dt>
          <dd>${this.status}</dd>
          <dt>Datum van bekendmaking:</dt>
          <dd>${this.datum}</dd>
          <dt>Type:</dt>
          <dd>${this.type}</dd>
        </dl>
        <span class="resolutions-detail__status resolutions-detail__status--${this.status_green ? 'true' : this.status_red ? 'false' : 'void'}" >${this.status}</span>
        <a href="${this.url}" class="teaser-overlay-link" tabindex="-1" aria-hidden="true">${this.titel}</a>
      </div>
    `);
  }

  renderResults(reglement) {
    this.titel = reglement.title.value;
    this.orgaan = '@todo';
    this.datum = this.formatDate(reglement.date.value)
    this.url = reglement.url.value;
    this.type = '@todo';
    this.status = reglement.status.value || '';
    this.approved = reglement.status.value == 'Goedgekeurd';
    this.innerHTML += this.createDetail();
  }

  formatDate(date) {
    date = new Date(date);
    const options = { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' }
    return date.toLocaleDateString('nl-be', options);
  }

  async getReglement(uri) {
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

customElements.define('reglementen-detail', ReglementenDetail);
