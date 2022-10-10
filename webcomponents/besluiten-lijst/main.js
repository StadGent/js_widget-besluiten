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
    this.getBesluiten();
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
          orgaan="${besluit.orgaan.value}"
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

  async getBesluiten() {
    const endpoint = this.getAttribute('sparql-endpoint') + "?query=" + encodeURIComponent(this.constructQuery());
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
    
    const bestuursorganen = this.getAttribute('bestuursorganen')  
    let filterparams = "";
    if (bestuursorganen) {
      const bestuursorganenArray = bestuursorganen.split(" ");
      filterparams += "VALUES ?bestuursorgaanURI { " + bestuursorganenArray.map(bestuursorgaan => `<${bestuursorgaan.trim()}>`).join(" ") + " }"
    }

    let queryBestuursorgaan = `           
        prov:wasGeneratedBy/dct:subject ?agendapunt .     
    
      ?zitting besluit:behandelt ?agendapunt ;
        besluit:isGehoudenDoor/mandaat:isTijdspecialisatieVan ?bestuursorgaanURI .`;

    // TODO: remove with query below after Bestuursorgaan has been moved to Zitting iso BehandelingVanAgendapunt
    const endpoint = this.getAttribute('sparql-endpoint')
    if (endpoint.includes("probe")) {
      queryBestuursorgaan = `
        prov:wasGeneratedBy ?behandelingVanAgendapunt .
        ?behandelingVanAgendapunt dct:subject ?agendapunt ;
          besluit:isGehoudenDoor/mandaat:isTijdspecialisatieVan ?bestuursorgaanURI .
        ?zitting besluit:behandelt ?agendapunt .`;
    }
    
    return `
      PREFIX dct: <http://purl.org/dc/terms/>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      PREFIX eli: <http://data.europa.eu/eli/ontology#>
      PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      PREFIX mandaat: <http://data.vlaanderen.be/ns/mandaat#>
      
      SELECT ?besluit ?title ?date ?agendapunt ?zitting ?orgaan WHERE {
        ?besluit a besluit:Besluit ;
          eli:date_publication ?date ;
          eli:title_short ?title ;
        ${queryBestuursorgaan}
        ?bestuursorgaanURI skos:prefLabel ?orgaan . 
        ${filterparams}
      } ORDER BY DESC(?date) LIMIT ${amount}`;
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
