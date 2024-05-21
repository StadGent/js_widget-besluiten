class BesluitenLijst extends HTMLElement {

  constructor() {
    super();
  }

  connectedCallback() {
    this.getBesluiten();
  }

  createDetail(besluit) {
    console.log(besluit);
    return `
      <besluiten-detail
        titel="${besluit.title.value}"
        orgaan="${besluit.orgaan.value}"
        datum="${besluit.zitting_datum.value}"
        url="${besluit.url.value}"
        status="${besluit.status.value}"
      ></besluiten-detail>
    `;
  }

  renderResults(besluiten) {
    const template = this.getTemplate();
    const shadowRoot = this.attachShadow({mode: 'open'}).appendChild(
      template.cloneNode(true)
    );

    let list = "";
    besluiten.forEach(besluit => {
      list += this.createDetail(besluit)
    });
    this.shadowRoot.querySelectorAll(".js-resolutions-items")[0].innerHTML = list;
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

    const statussen = this.getAttribute('statussen')
    const bestuurseenheden = this.getAttribute('bestuurseenheden')
    const bestuursorganen = this.getAttribute('bestuursorganen')
    let filterparams = "";
    if (statussen) {
      const statussenArray = statussen.split(",");
      filterparams += "VALUES ?status { " + statussenArray.map(status => `"${status.trim()}"@nl`).join(" ") + " }"
    }
    if (bestuurseenheden) {
      const bestuurseenhedenArray = bestuurseenheden.split(" ");
      filterparams += "VALUES ?bestuureenheidURI { " + bestuurseenhedenArray.map(bestuurseenheid => `<${bestuurseenheid.trim()}>`).join(" ") + " }"
    }
    if (bestuursorganen) {
      const bestuursorganenArray = bestuursorganen.split(" ");
      filterparams += "VALUES ?bestuursorgaanURI { " + bestuursorganenArray.map(bestuursorgaan => `<${bestuursorgaan.trim()}>`).join(" ") + " }"
    }

    let queryBestuursorgaan = `
        prov:wasGeneratedBy/dct:subject ?agendapunt .     
    
      ?zitting besluit:behandelt ?agendapunt ;
        besluit:geplandeStart ?zitting_datum ;
        besluit:isGehoudenDoor/mandaat:isTijdspecialisatieVan ?bestuursorgaanURI .`;
    let queryBestuurseenheid = `?bestuursorgaanURI besluit:bestuurt ?bestuureenheidURI.`;

    // @todo: remove OPTIONAL {} when eenheden are available.
    queryBestuurseenheid = `OPTIONAL {${queryBestuurseenheid}}`;

    // TODO: remove with query below after Bestuursorgaan has been moved to Zitting iso BehandelingVanAgendapunt
    const endpoint = this.getAttribute('sparql-endpoint')
    if (endpoint.includes("probe")) {
      queryBestuursorgaan = `
        prov:wasGeneratedBy ?behandelingVanAgendapunt .
        ?behandelingVanAgendapunt dct:subject ?agendapunt .
        ?agendapunt ^besluit:behandelt ?zitting .
        ?zitting besluit:isGehoudenDoor ?bestuursorgaanURI ;
          besluit:geplandeStart ?zitting_datum.
      `;
    }

    return `
      PREFIX dct: <http://purl.org/dc/terms/>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      PREFIX eli: <http://data.europa.eu/eli/ontology#>
      PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      PREFIX mandaat: <http://data.vlaanderen.be/ns/mandaat#>

      SELECT DISTINCT ?besluit ?title ?agendapunt ?zitting ?zitting_datum ?orgaan ?url ?status WHERE {
        ?besluit a besluit:Besluit ;
          eli:title_short ?title ;
          prov:wasDerivedFrom ?url ;
          prov:wasGeneratedBy/besluit:heeftStemming/besluit:gevolg ?status ;
        ${queryBestuursorgaan}
        ?bestuursorgaanURI skos:prefLabel ?orgaanLabel . 
        ${filterparams}
        BIND(CONCAT(UCASE(SUBSTR(?orgaanLabel, 1, 1)), SUBSTR(?orgaanLabel, 2)) AS ?orgaan)
        ${queryBestuurseenheid}
      } ORDER BY DESC(?zitting_datum) LIMIT ${amount}
    `;
  }

  getTemplate() {
    const template = `
      <template id="template-besluiten-lijst">
        <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Fira+Sans:400,600,700">
        <link rel="stylesheet" href="https://stijlgids.stad.gent/v6/css/styleguide.css">
        <link rel="stylesheet" href="https://stijlgids.stad.gent/v6/css/main.css">
        <link rel="stylesheet" href="https://stadgent.github.io/js_widget-besluiten/besluiten-lijst/besluiten-lijst.css">
        
        <div class="resolutions-list cs--blue">
          <section class="highlight">
            <div class="highlight__inner">
              <slot name="title" class="h3">Recente besluiten</slot>
              
              <div class="resolutions-list__items js-resolutions-items"></div>
              
              <slot name="raadpleegomgeving"><a href="https://ebesluitvorming.gent.be/" class="button button-primary">Alle besluiten van Stad Gent</a></slot>
            </div>
          </section>
        </div>
      </template>
    `;

    if (!document.getElementById("template-besluiten-lijst")) {
      document.body.innerHTML += template;
    }

    return document.getElementById("template-besluiten-lijst").content;
  }
}

customElements.define('besluiten-lijst', BesluitenLijst);
