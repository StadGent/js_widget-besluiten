const BESTUURSEENHEID_URI = "";
const BESTUURSORGANEN_URIS = "";
const REGLEMENT_TYPES = "";
const TITLE = "";
const BUTTON_URL = "";

class BesluitenLijst extends HTMLElement {

  constructor() {
    super();
  }

  connectedCallback() {
    this.getReglementen();
  }

  getUrl(besluit) {
    var zitting = /[^/]*$/.exec(besluit.zitting.value)[0];
    var agendapunt = /[^/]*$/.exec(besluit.agendapunt.value)[0];
    return `https://ebesluitvorming.gent.be/zittingen/${zitting}/agendapunten/${agendapunt}`;
  }

  createDetail(besluit) {
    var url = this.getUrl(besluit);
    return (`
      <li>
        <besluiten-detail
          titel="${besluit.title.value}"
          orgaan="@todo"
          datum="${besluit.date.value}"
          url="${url}"
          status="@todo"
        >
      </li>
    `);
  }

  renderResults(besluiten) {
    const template = this.getTemplate();
    //this.appendChild(template.cloneNode(true));
    const shadowRoot =this.attachShadow({mode: 'open'}).appendChild(
      template.cloneNode(true)
    );

    var list = "";
    besluiten.forEach(besluit => {
      list += this.createDetail(besluit)
    });
    this.shadowRoot.querySelectorAll(".besluiten-list__items")[0].innerHTML = list;
  }

  async getReglementen() {
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
      //console.log(JSON.stringify(json.results.bindings));
      this.renderResults(json.results.bindings);
    } else {
      console.log("Error when getting data.");
    }
  }

  constructQuery() {
    const amount = this.getAttribute('aantal');
    return `
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX prov: <http://www.w3.org/ns/prov#>
    PREFIX eli: <http://data.europa.eu/eli/ontology#>
    PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
    
    SELECT ?besluit ?title ?date ?agendapunt ?zitting WHERE {
      ?besluit a besluit:Besluit ;
      eli:date_publication ?date ;
      eli:title_short ?title ;
      prov:wasGeneratedBy/dct:subject ?agendapunt .
    
      ?zitting besluit:behandelt ?agendapunt .
    } ORDER BY DESC(?date) LIMIT ${amount}`
  }

  getTemplate() {
    const template = `
      <template id="template-besluiten-lijst">
        <h2 class="besluiten-list__title"><slot name="title">Recente besluiten</slot></h2>
    
        <ul class="besluiten-list__items">
        </ul>
    
        <slot name="link"><a href="https://ebesluitvorming.gent.be/">Alle besluiten van Stad Gent</a></slot>
      </template>
    `;

    if (!document.getElementById("template-besluiten-lijst")) {
      document.body.innerHTML += template;
    }

    return document.getElementById("template-besluiten-lijst").content;
  }
}

customElements.define('besluiten-lijst', BesluitenLijst);
