class ReglementenLijst extends HTMLElement {

  constructor() {
    super();
  }

  connectedCallback() {
    this.getReglementen();
  }

  createDetail(reglement) {
    return `
      <reglementen-detail
        titel="${reglement.title.value}"
        orgaan="${reglement.orgaan.value}"
        datum="${reglement.publicatie_datum.value}"
        url="${reglement.url.value}"
        type="@todo"
      ></reglementen-detail>
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
    this.shadowRoot.querySelectorAll(".js-reglementen-items")[0].innerHTML = list;
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
      
      SELECT ?besluit ?title ?publicatie_datum ?agendapunt ?zitting ?orgaan ?url WHERE {
        ?besluit a besluit:Besluit ;
          a <https://data.vlaanderen.be/id/concept/BesluitType/67378dd0-5413-474b-8996-d992ef81637a> ;
          eli:date_publication ?publicatie_datum ;
          eli:title_short ?title ;
          prov:wasDerivedFrom ?url ;
          ${queryBestuursorgaan}
        ?bestuursorgaanURI skos:prefLabel ?orgaan . 
        ${filterparams}
      } ORDER BY DESC(?publicatie_datum) LIMIT ${amount}`;
  }

  getTemplate() {
    const template = `
      <template id="template-reglementen-lijst">    
        <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Fira+Sans:400,600,700">
        <link rel="stylesheet" href="https://stijlgids.stad.gent/v6/css/styleguide.css">
        <link rel="stylesheet" href="https://stijlgids.stad.gent/v6/css/main.css">
        <link rel="stylesheet" href="https://stadgent.github.io/js_widget-besluiten/besluiten-lijst/besluiten-lijst.css">
        
        <div class="reglementen-list cs--blue">
          <section class="highlight">
            <div class="highlight__inner">
              <slot name="title">Recente reglementen</slot>
              <div class="reglementen-list__items js-reglementen-items"></div>
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
