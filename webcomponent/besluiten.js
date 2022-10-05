const URL = "http://srvprobepr01.gentgrp.gent.be";

const REGLEMENTEN = `
PREFIX eli: <http://data.europa.eu/eli/ontology#>
PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>


SELECT ?besluit ?title ?date WHERE {
  ?besluit a besluit:Besluit ;
    eli:date_publication ?date ;
    eli:title_short ?title .
} ORDER BY DESC(?date) LIMIT 5`;

class Besluiten extends HTMLElement {

  constructor() {
    super();

  }

  connectedCallback() {
    const reglementen = this.getReglementen();
  }

  renderResults(reglementen) {
    let html = '';
    reglementen.forEach(reglement => {
      html += `<p>reglement ${reglement.date.value}<br><strong>${reglement.title.value}</strong></p>`;
    });
    this.innerHTML = html;
  }

  async getReglementen() {
    const endpoint = URL + "/sparql?query=" + encodeURIComponent(REGLEMENTEN);
    const response = await fetch(endpoint,  
      { headers: { 
          'Content-Type' : 'application/x-www-form-urlencoded',
          'Accept' : 'application/sparql-results+json'
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

}

customElements.define( 'besluiten-list', Besluiten )