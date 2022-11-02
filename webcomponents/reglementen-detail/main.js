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
      this.innerHTML += this.createDetail();
    }
  }

  createDetail() {
    return (`
      <style>
        @charset "UTF-8";
        @import url("https://fonts.googleapis.com/css?family=Fira+Sans:400,600,700");
        @import url("https://stijlgids.stad.gent/v5/css/styleguide.css");
        @import url("https://stijlgids.stad.gent/v5/css/main.css");
        reglementen-detail dd, reglementen-detail dt {
          display: inline;
          padding-left: 0;
        }
        reglementen-detail dl>dd:not(:last-of-type):after {
          display: inline-block;
          padding: 0 0.2em;
          content: "\\007C";
        }
      </style>
      <div class="card">
        <div>
          <h3>
            <a href="${this.url}">${this.titel}</a>
          </h3>
          <dl>
            <dt>Orgaan:</dt>
            <dd>${this.orgaan}</dd>
            <dt>Datum van bekendmaking:</dt>
            <dd>${this.datum}</dd>
          </dl>
          <span class="type" style="display: none">${this.type} type</span>
        </div>
      </div>
    `);
  }

  getUrl(reglement) {
    let zitting = /[^/]*$/.exec(reglement.zitting.value)[0];
    let agendapunt = /[^/]*$/.exec(reglement.agendapunt.value)[0];
    return `https://ebesluitvorming.gent.be/zittingen/${zitting}/agendapunten/${agendapunt}`;
  }

  renderResults(reglement) {
    this.titel = reglement.title.value;
    this.orgaan = '@todo';
    this.datum = this.formatDate(reglement.date.value)
    this.url = this.getUrl(reglement);
    this.type = '@todo';
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
    
    SELECT ?title ?date ?agendapunt ?zitting WHERE {
      <${uri}> a besluit:Besluit ;
        eli:date_publication ?date ;
        eli:title_short ?title ;
        prov:wasGeneratedBy/dct:subject ?agendapunt .
    
      ?zitting besluit:behandelt ?agendapunt .
    } LIMIT 1`
  }

}

customElements.define('reglementen-detail', ReglementenDetail);
