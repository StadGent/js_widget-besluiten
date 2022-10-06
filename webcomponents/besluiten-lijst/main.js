const BESTUURSEENHEID_URI = "";
const BESTUURSORGANEN_URIS = "";
const REGLEMENT_TYPES = "";
const TITLE = "";
const BUTTON_URL = "";

const TEMPLATE_LIST = `
  <template id="besluiten-lijst">
    <h2 class="besluiten-list__title"><slot name="list_title">Lijst van besluiten</slot></h2>

    <ul class="besluiten-list__items">
    </ul>

    <a href="{{ item_link }}" class="besluiten-list__cta"></a>
  </template>`;

const TEMPLATE_DETAIL = `
  <template id="besluit-detail">
    <li class="besluiten-list__item besluiten-list__item--{{ status }}">
      <h3 class="besluiten-list__item-title">
        <a href="{{ item_link }}" class="besluiten-list__item-link">
          <slot name="item_title">Besluit</slot>
        </a>
      </h3>
      <p>Goedkeuring: <slot name="item_time"></slot></p>
      <!--
      <p class="besluiten-list__item-content">
        {{ gemeenteraad }}
        {{ time }}
      </p>
      <span class="besluiten-list__item-status">{{ status }}</span>
      -->
    </li>
  </template>`;

class BesluitenLijst extends HTMLElement {

  constructor() {
    super();

    if (!document.getElementById("besluiten-lijst")) {
      document.body.innerHTML += TEMPLATE_LIST;
    }
    if (!document.getElementById("besluit-detail")) {
      document.body.innerHTML += TEMPLATE_DETAIL;
    }
  }

  connectedCallback() {
    const reglementen = this.getReglementen();
  }

  renderResults(reglementen) {
    const template = document.getElementById("besluiten-lijst").content;
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
      const elementTemplate = document.getElementById("besluit-detail").content;
      shadowRoot.querySelectorAll(".besluiten-list__items")[0].appendChild(elementTemplate.cloneNode(true));

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

customElements.define('besluiten-lijst', BesluitenLijst);
