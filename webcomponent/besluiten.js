const URL_GENT = "http://srvprobepr01.gentgrp.gent.be/sparql";
const URL_LBLOD = "https://centrale-vindplaats.lblod.info/sparql";
const URL_LBLOD_QA = "https://qa.centrale-vindplaats.lblod.info/sparql";
const SPARQL_ENDPOINT = URL_GENT;

const BESTUURSEENHEID_URI = "";
const BESTUURSORGANEN_URIS = "";
const REGLEMENT_TYPES = "";
const TITLE = "De meest recente reglementen";
const BUTTON_URL = "";

class Besluiten extends HTMLElement {

  constructor() {
    super();

  }

  connectedCallback() {
    const reglementen = this.getReglementen();
  }

  renderResults(reglementen) {
    const template = document.getElementById("besluiten-template").content;
    const shadowRoot = this.attachShadow({ mode: "open" });
    shadowRoot.appendChild(template.cloneNode(true));

    // set parent slots
    if (TITLE.length > 0) {
      let slots = this.shadowRoot.querySelectorAll('slot');
      slots.forEach(slot => {
        switch (slot.name) {
          case "list_title":
            slot.outerHTML = TITLE;
            break;
        }
      });
    }

    // create an element template for each query result element
    reglementen.forEach(reglement => {
      const elementTemplate = document.getElementById("besluit-element").content;
      shadowRoot.appendChild(elementTemplate.cloneNode(true));

      // set child slots
      let slots = this.shadowRoot.querySelectorAll('slot');
      slots.forEach(slot => {
        console.log(slot);
        switch (slot.name) {
          case "item_title":
            slot.outerHTML = reglement.title.value;
            break;
          case "item_time":
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
            let date = new Date(reglement.date.value);
            slot.outerHTML = date.toLocaleDateString('be-NL', options);
            break;
        }
      });
    });

  }

  async getReglementen() {
    const endpoint = SPARQL_ENDPOINT + "?query=" + encodeURIComponent(this.constructQuery());
    const response = await fetch(endpoint,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/sparql-results+json'
        }
      });

    if (response.ok) {
      const json = await response.json();
      console.log(JSON.stringify(json.results.bindings));
      this.renderResults(json.results.bindings);
    } else {
      console.log("Error when getting data.");
    }
  }

  constructQuery() {
    return `PREFIX eli: <http://data.europa.eu/eli/ontology#>
    PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
    
    
    SELECT ?besluit ?title ?date WHERE {
      ?besluit a besluit:Besluit ;
        eli:date_publication ?date ;
        eli:title_short ?title .
    } ORDER BY DESC(?date) LIMIT 5`
  }
}

customElements.define('besluiten-widget', Besluiten);
