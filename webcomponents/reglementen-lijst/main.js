class ReglementenLijst extends HTMLElement {

  static types = {
    "https://data.vlaanderen.be/id/concept/BesluitType/0d1278af-b69e-4152-a418-ec5cfd1c7d0b":"Aanvullend reglement op het wegverkeer m.b.t. gemeentewegen in speciale beschermingszones",
    "https://data.vlaanderen.be/id/concept/BesluitType/256bd04a-b74b-4f2a-8f5d-14dda4765af9":"Tijdelijke politieverordening (op het wegverkeer)",
    "https://data.vlaanderen.be/id/concept/BesluitType/25deb453-ae3e-4d40-8027-36cdb48ab738":"Deontologische Code",
    "https://data.vlaanderen.be/id/concept/BesluitType/3bba9f10-faff-49a6-acaa-85af7f2199a3":"Aanvullend reglement op het wegverkeer m.b.t. gemeentewegen in havengebied",
    "https://data.vlaanderen.be/id/concept/BesluitType/4673d472-8dbc-4cea-b3ab-f92df3807eb3":"Personeelsreglement",
    "https://data.vlaanderen.be/id/concept/BesluitType/4d8f678a-6fa4-4d5f-a2a1-80974e43bf34":"Aanvullend reglement op het wegverkeer enkel m.b.t. gemeentewegen (niet in havengebied of speciale beschermingszones)",
    "https://data.vlaanderen.be/id/concept/BesluitType/5ee63f84-2fa0-4758-8820-99dca2bdce7c":"Delegatiereglement",
    "https://data.vlaanderen.be/id/concept/BesluitType/7d95fd2e-3cc9-4a4c-a58e-0fbc408c2f9b":"Aanvullend reglement op het wegverkeer m.b.t. één of meerdere gewestwegen",
    "https://data.vlaanderen.be/id/concept/BesluitType/84121221-4217-40e3-ada2-cd1379b168e1":"Andere",
    "https://data.vlaanderen.be/id/concept/BesluitType/a8486fa3-6375-494d-aa48-e34289b87d5b":"Huishoudelijk reglement",
    "https://data.vlaanderen.be/id/concept/BesluitType/ba5922c9-cfad-4b2e-b203-36479219ba56":"Retributiereglement",
    "https://data.vlaanderen.be/id/concept/BesluitType/d7060f97-c417-474c-abc6-ef006cb61f41":"Subsidie, premie, erkenning",
    "https://data.vlaanderen.be/id/concept/BesluitType/e8aee49e-8762-4db2-acfe-2d5dd3c37619":"Reglement Onderwijs",
    "https://data.vlaanderen.be/id/concept/BesluitType/e8afe7c5-9640-4db8-8f74-3f023bec3241":"Politiereglement",
    "https://data.vlaanderen.be/id/concept/BesluitType/efa4ec5a-b006-453f-985f-f986ebae11bc":"Belastingreglement",
    "https://data.vlaanderen.be/id/concept/BesluitType/fb92601a-d189-4482-9922-ab0efc6bc935":"Gebruikersreglement"
  };

  constructor() {
    super();
    this.amount = parseInt(this.getAttribute('aantal')) || 10;
    this.pager = this.getAttribute('pager') !== null;
    this.offset = 0;
    this.maxCount = 1000;
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
        type="${ReglementenLijst.types[reglement.type.value]}"
        status="${reglement.status.value}"
      ></reglementen-detail>
    `;
  }

  renderResults(reglementen) {
    if (!this.shadowRoot) {  // Only attach a shadow root if one does not exist
      const template = this.getTemplate();
      this.attachShadow({mode: 'open'}).appendChild(
          template.cloneNode(true)
      );
    }

    let list = "";
    reglementen.forEach(reglement => {
      list += this.createDetail(reglement)
    });
    this.shadowRoot.querySelectorAll(".js-reglementen-items")[0].innerHTML = list;

    if (this.pager) {
      this.shadowRoot.querySelectorAll(".pager")[0].innerHTML = this.getPager();

      this.nextButton = this.shadowRoot.querySelector('#js-pager-next');
      if (this.nextButton) {
        this.nextButton.addEventListener('click', (event) => {
          event.preventDefault();
          this.pageUp();
        });
      }
      this.previousButton = this.shadowRoot.querySelector('#js-pager-previous');
      if (this.previousButton) {
        this.previousButton.addEventListener('click', (event) => {
          event.preventDefault();
          this.pageDown();
        });
      }
    }
  }

  async executeQuery(query) {
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
      return json;
    } else {
      console.log("Error when getting data.");
      console.log(query);
    }
  }

  async getReglementen() {
    let query = this.constructQuery();
    if (this.pager) {
      let count = await this.executeQuery(this.countQuery);
      this.maxCount = count.results.bindings[0]['count'].value;
      console.log(this.maxCount);
    }

    let json = await this.executeQuery(this.selectQuery);
    if (json) {
      this.renderResults(json.results.bindings);
    }
  }

  constructQuery() {
    let filterparams = "";

    // Status filter.
    const statussen = this.getAttribute('statussen');
    if (statussen) {
      const statussenArray = statussen.split(",");
      filterparams += "VALUES ?status { " + statussenArray.map(status => `"${status.trim()}"@nl`).join(" ") + " }"
    } else {
      filterparams += `BIND(COALESCE(?status, "Ontwerp") AS ?status)`;
    }
    console.log(statussen);

    // Type filter.
    const types = this.getAttribute('types');
    if (types) {
      const typesArray = types.split(" ");
      filterparams += "VALUES ?type { " + typesArray.map(type => `<${type.trim()}>`).join(" ") + " }"
    } else {
      filterparams += `VALUES ?type { ${Object.keys(ReglementenLijst.types).map((type) => `<${type}>`).join(" ")} }`;
    }

    // Taxonomy filter.
    let queryThema = '';
    const taxonomy = this.getAttribute('taxonomy') || 'http://stad.gent/id/concepts/decision_making_themes';
    const concepts = this.getAttribute('concepts');
    if (concepts) {
      const conceptsArray = concepts.split(" ");
      queryThema = `
        ?besluit ext:hasAnnotation ?annotation .
        ?annotation ext:withTaxonomy ?thema ;
                             ext:creationDate ?date ;
                             ext:hasLabel ?label .
        ?label ext:isTaxonomy ?concept .
        VALUES ?thema { <${taxonomy}> }
        VALUES ?concept { ` + conceptsArray.map(concept => `<${concept.trim()}>`).join(" ") + ` }
        FILTER (!CONTAINS(STR(?url), "/notulen"))
        FILTER (!CONTAINS(STR(?orgaan), "personeel"))
        FILTER (!CONTAINS(STR(?orgaan), "gemeenteraad"))
      `;
    }

    // Bestuurseenheden filter.
    const bestuurseenheden = this.getAttribute('bestuurseenheden');
    if (bestuurseenheden) {
      const bestuurseenhedenArray = bestuurseenheden.split(" ");
      filterparams += "VALUES ?bestuureenheidURI { " + bestuurseenhedenArray.map(bestuurseenheid => `<${bestuurseenheid.trim()}>`).join(" ") + " }"
    }

    // Bestuursorganen filter.
    const bestuursorganen = this.getAttribute('bestuursorganen');
    if (bestuursorganen) {
      const bestuursorganenArray = bestuursorganen.split(" ");
      filterparams += "VALUES ?bestuursorgaanURI { " + bestuursorganenArray.map(bestuursorgaan => `<${bestuursorgaan.trim()}>`).join(" ") + " }"
    }

    // Date filter.
    const startdate = this.getAttribute('start');
    const enddate = this.getAttribute('eind');
    if (startdate && enddate) {
      filterparams += `FILTER(?zitting_datum >= "${startdate}"^^xsd:date && ?zitting_datum <= "${enddate}"^^xsd:date)`;
    } else if (startdate) {
      filterparams += `FILTER(?zitting_datum >= "${startdate}"^^xsd:date)`;
    } else if (enddate) {
      filterparams += `FILTER(?zitting_datum <= "${enddate}"^^xsd:date)`;
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
        ?behandelingVanAgendapunt dct:subject ?agendapunt .
        ?agendapunt ^besluit:behandelt ?zitting .
        ?zitting besluit:isGehoudenDoor ?bestuursorgaanURI ;
          besluit:geplandeStart ?zitting_datum.
        `;
    }

    this.selectQuery = `
      PREFIX dct: <http://purl.org/dc/terms/>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      PREFIX eli: <http://data.europa.eu/eli/ontology#>
      PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      PREFIX mandaat: <http://data.vlaanderen.be/ns/mandaat#>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

      SELECT 
        DISTINCT ?besluit ?title ?publicatie_datum ?agendapunt ?zitting ?orgaan ?url ?status ?type 
      WHERE {
        ?besluit a besluit:Besluit ;
          a ?type ;
          eli:date_publication ?publicatie_datum ;
          eli:title_short ?title ;
          prov:wasDerivedFrom ?url ;
          prov:wasGeneratedBy/besluit:heeftStemming/besluit:gevolg ?status ;
          ${queryBestuursorgaan}
        ?bestuursorgaanURI skos:prefLabel ?orgaan .
        OPTIONAL { ?bestuursorgaanURI besluit:bestuurt ?bestuureenheidURI . }

        ${queryThema}
        ${filterparams}
        FILTER (!CONTAINS(STR(?url), "/notulen"))
        FILTER (!CONTAINS(STR(?orgaan), "personeel"))
        FILTER (!CONTAINS(STR(?orgaan), "gemeenteraad"))
      }
      ORDER BY DESC(?publicatie_datum)
      LIMIT ${this.amount}
      OFFSET ${this.offset}
      `;

    this.countQuery = `
      PREFIX dct: <http://purl.org/dc/terms/>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      PREFIX eli: <http://data.europa.eu/eli/ontology#>
      PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      PREFIX mandaat: <http://data.vlaanderen.be/ns/mandaat#>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

      SELECT
        (COUNT(DISTINCT(?besluit)) AS ?count) 
      WHERE {
        ?besluit a besluit:Besluit ;
          a ?type ;
          eli:date_publication ?publicatie_datum ;
          eli:title_short ?title ;
          prov:wasDerivedFrom ?url ;
          prov:wasGeneratedBy/besluit:heeftStemming/besluit:gevolg ?status ;
          ${queryBestuursorgaan}
        ?bestuursorgaanURI skos:prefLabel ?orgaan .
        OPTIONAL { ?bestuursorgaanURI besluit:bestuurt ?bestuureenheidURI . }

        ${queryThema}
        ${filterparams}
        FILTER (!CONTAINS(STR(?url), "/notulen"))
        FILTER (!CONTAINS(STR(?orgaan), "personeel"))
        FILTER (!CONTAINS(STR(?orgaan), "gemeenteraad"))
      }`;

    return this.selectQuery;
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
              <div class="pager"></div>
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

  pageUp() {
    this.offset += this.amount;
    console.log(this.offset);
    this.getReglementen()
  }

  pageDown() {
    if (this.offset >= this.amount) {
      this.offset -= this.amount;
      console.log(this.offset);
      this.getReglementen()
    }
  }

  getPager() {
    let previous = '';
    let next = '';
    let currentPage = Math.floor(this.offset / this.amount) + 1;
    let totalPages = Math.ceil(this.maxCount / this.amount);

    if (this.offset >= this.amount) {
      previous = `
        <li class="previous" id="js-pager-previous"><a href="#" class="standalone-link back">
            Vorige
            <span class="visually-hidden">pagina</span></a></li>
      `;
    }

    if (this.offset < this.maxCount - this.amount) {
      next = `
        <li class="next" id="js-pager-next"><a href="#" class="standalone-link">
            Volgende
            <span class="visually-hidden">pagina</span></a></li>
      `;
    }

    return `
    <nav class="pager" aria-labelledby="pagination">
      <h2 id="pagination" class="visually-hidden">Paginatie</h2>
      <ul class="pager__items">
        ${previous}
        <li class="current-page">Pagina ${currentPage} van ${totalPages}</li>
        ${next}
      </ul>
    </nav>
    `;
  }
}

customElements.define('reglementen-lijst', ReglementenLijst);
