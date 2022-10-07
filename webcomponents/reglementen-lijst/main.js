const BESTUURSEENHEID_URI = "";
const BESTUURSORGANEN_URIS = "";
const REGLEMENT_TYPES = "";
const TITLE = "";
const BUTTON_URL = "";

class ReglementenLijst extends HTMLElement {

  constructor() {
    super();
  }

  connectedCallback() {
    this.getReglementen();
  }

  getUrl(reglement) {
    var zitting = /[^/]*$/.exec(reglement.zitting.value)[0];
    var agendapunt = /[^/]*$/.exec(reglement.agendapunt.value)[0];
    return `https://ebesluitvorming.gent.be/zittingen/${zitting}/agendapunten/${agendapunt}`;
  }

  createDetail(reglement) {
    var url = this.getUrl(reglement);
    return (`
      <li>
        <reglementen-detail
          titel="${reglement.title.value}"
          orgaan="${reglement.orgaan.value}"
          datum="${reglement.date.value}"
          url="${url}"
          status="@todo"
        >
      </li>
    `);
  }

  renderResults(reglementen) {
    const template = this.getTemplate();
    //this.appendChild(template.cloneNode(true));
    const shadowRoot =this.attachShadow({mode: 'open'}).appendChild(
      template.cloneNode(true)
    );

    var list = "";
    reglementen.forEach(reglement => {
      list += this.createDetail(reglement)
    });
    this.shadowRoot.querySelectorAll(".reglementen-list__items")[0].innerHTML = list;
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
    const endpoint = this.getAttribute('endpoint')
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
          a <https://data.vlaanderen.be/id/concept/BesluitType/67378dd0-5413-474b-8996-d992ef81637a> ;
          eli:date_publication ?date ;
          eli:title_short ?title ;
          ${queryBestuursorgaan}
        ?bestuursorgaanURI skos:prefLabel ?orgaan . 
        ${filterparams}
      } ORDER BY DESC(?date) LIMIT ${amount}`;
  }

  getTemplate() {
    const template = `
      <template id="template-reglementen-lijst">
        <h2 class="reglementen-list__title"><slot name="title">Recente reglementen</slot></h2>
    
        <ul class="reglementen-list__items">
        </ul>
    
        <slot name="link"><a href="https://ebesluitvorming.gent.be/">Alle reglementen van Stad Gent</a></slot>
      </template>
    `;

    if (!document.getElementById("template-reglementen-lijst")) {
      document.body.innerHTML += template;
    }

    return document.getElementById("template-reglementen-lijst").content;
  }
}

customElements.define('reglementen-lijst', ReglementenLijst);
