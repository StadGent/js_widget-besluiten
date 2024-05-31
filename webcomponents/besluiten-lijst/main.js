class BesluitenLijst extends HTMLElement {

  constructor() {
    super();
    this.amount = parseInt(this.getAttribute('aantal')) || 10;
    this.pager = this.getAttribute('pager') !== null;
    this.offset = 0;
    this.maxCount = 1000;
  }

  connectedCallback() {
    this.getBesluiten();
  }

  createDetail(besluit) {
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
    if (!this.shadowRoot) {  // Only attach a shadow root if one does not exist
      const template = this.getTemplate();
      this.attachShadow({mode: 'open'}).appendChild(
          template.cloneNode(true)
      );
    }

    let list = "";
    besluiten.forEach(besluit => {
      list += this.createDetail(besluit)
    });

    this.shadowRoot.querySelectorAll(".js-resolutions-items")[0].innerHTML = list;

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

  async getBesluiten() {
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
    const statussen = this.getAttribute('statussen');
    const bestuurseenheden = this.getAttribute('bestuurseenheden');
    const bestuursorganen = this.getAttribute('bestuursorganen');
    const taxonomy = this.getAttribute('taxonomy') || 'http://stad.gent/id/concepts/decision_making_themes';
    const concepts = this.getAttribute('concepts');
    let filterparams = "";
    if (statussen) {
      const statussenArray = statussen.split(",");
      filterparams += "VALUES ?status { " + statussenArray.map(status => `"${status.trim()}"@nl`).join(" ") + " }"
    } else {
      filterparams += `BIND(COALESCE(?statusLabel, "Ontwerp") AS ?status)`;
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
    let queryThema = '';
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

    // @TODO: remove OPTIONAL {} when eenheden are available.
    queryBestuurseenheid = `OPTIONAL {${queryBestuurseenheid}}`;

    // @TODO: remove with query below after Bestuursorgaan has been moved to Zitting iso BehandelingVanAgendapunt
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

    let orderbyClause = 'ORDER BY DESC(?zitting_datum)';
    let limitClause = `LIMIT ${this.amount}`;
    let offsetClause = `OFFSET ${this.offset}`;

    this.selectQuery = this.getQuery(
        'DISTINCT ?besluit ?title ?agendapunt ?zitting ?zitting_datum ?orgaan ?url ?status',
        queryBestuursorgaan,
        queryThema,
        filterparams,
        queryBestuurseenheid,
        orderbyClause,
        limitClause,
        offsetClause
    );

    this.countQuery = this.getQuery('(COUNT(DISTINCT(?besluit)) AS ?count)',
        queryBestuursorgaan,
        queryThema,
        filterparams,
        queryBestuurseenheid
    );

    return this.selectQuery;
  }

  getQuery(fields, queryBestuursorgaan, queryThema, filterparams, queryBestuurseenheid, orderbyClause='', limitClause='', offsetClause='') {
    return `
      PREFIX dct: <http://purl.org/dc/terms/>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      PREFIX eli: <http://data.europa.eu/eli/ontology#>
      PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      PREFIX mandaat: <http://data.vlaanderen.be/ns/mandaat#>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

      SELECT
        ${fields}
      WHERE {
        ?besluit a besluit:Besluit ;
          eli:title_short ?title ;
          prov:wasDerivedFrom ?url ;
          prov:wasGeneratedBy/besluit:heeftStemming/besluit:gevolg ?statusLabel ;
        ${queryBestuursorgaan}

        ?bestuursorgaanURI skos:prefLabel ?orgaanLabel .
        ${queryThema}
        ${queryBestuurseenheid}
        ${filterparams}
        BIND(CONCAT(UCASE(SUBSTR(?orgaanLabel, 1, 1)), SUBSTR(?orgaanLabel, 2)) AS ?orgaan)
      }
      ${orderbyClause}
      ${limitClause}
      ${offsetClause}
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

              <div class="pager"></div>

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

  pageUp() {
    this.offset += this.amount;
    console.log(this.offset);
    this.getBesluiten()
  }

  pageDown() {
    if (this.offset >= this.amount) {
      this.offset -= this.amount;
      console.log(this.offset);
      this.getBesluiten()
    }
  }

  getPager() {
    let previous = '';
    let next = '';

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
        ${next}
      </ul>
    </nav>
    `;
  }
}

customElements.define('besluiten-lijst', BesluitenLijst);
