class ReglementenLijst extends HTMLElement {

  constructor() {
    super();
  }

  connectedCallback() {
    this.getReglementen();
  }

  getUrl(reglement) {
    let zitting = /[^/]*$/.exec(reglement.zitting.value)[0];
    let agendapunt = /[^/]*$/.exec(reglement.agendapunt.value)[0];
    return `https://ebesluitvorming.gent.be/zittingen/${zitting}/agendapunten/${agendapunt}`;
  }

  createDetail(reglement) {
    let url = this.getUrl(reglement);
    return `
      <reglementen-detail
        titel="${reglement.title.value}"
        orgaan="${reglement.orgaan.value}"
        datum="${reglement.publicatie_datum.value}"
        url="${url}"
        type="@todo"
      >
    `;
  }

  renderResults(reglementen) {
    const template = this.getTemplate();
    //this.appendChild(template.cloneNode(true));
    const shadowRoot =this.attachShadow({mode: 'open'}).appendChild(
      template.cloneNode(true)
    );

    let list = "";
    reglementen.forEach(reglement => {
      list += this.createDetail(reglement)
    });
    this.shadowRoot.querySelectorAll(".reglementen-list__items")[0].innerHTML = list;
  }

  async getReglementen() {
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
      
      SELECT ?besluit ?title ?publicatie_datum ?agendapunt ?zitting ?orgaan WHERE {
        ?besluit a besluit:Besluit ;
          a <https://data.vlaanderen.be/id/concept/BesluitType/67378dd0-5413-474b-8996-d992ef81637a> ;
          eli:date_publication ?publicatie_datum ;
          eli:title_short ?title ;
          ${queryBestuursorgaan}
        ?bestuursorgaanURI skos:prefLabel ?orgaan . 
        ${filterparams}
      } ORDER BY DESC(?publicatie_datum) LIMIT ${amount}`;
  }

  getTemplate() {
    const template = `
      <template id="template-reglementen-lijst">
        <style>
          @charset "UTF-8";
          @import url("https://fonts.googleapis.com/css?family=Fira+Sans:400,600,700");
          @import url("https://stijlgids.stad.gent/v5/css/styleguide.css");
          @import url("https://stijlgids.stad.gent/v5/css/main.css");
          h2 {
            font: 600 26px Fira Sans,sans-serif;
          }
        </style>
    
        <div class="cs--cyan">
          <section class="cs--cyan highlight checklist highlight--top">
            <div class="highlight__inner">
              <h2><slot name="title">Recente reglementen</slot></h2>
          
              <div class="reglementen-list__items">
              </div>
          
              <slot name="raadpleegomgeving"><a href="https://ebesluitvorming.gent.be/" class="button button-primary">Alle reglementen van Stad Gent</a></slot>
            </div>
          </section>
        </div>
      </template>
    `;

    if (!document.getElementById("template-reglementen-lijst")) {
      document.body.innerHTML += template;
    }

    return document.getElementById("template-reglementen-lijst").content;
  }
}

customElements.define('reglementen-lijst', ReglementenLijst);
