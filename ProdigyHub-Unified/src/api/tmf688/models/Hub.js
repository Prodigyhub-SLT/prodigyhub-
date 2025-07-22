const { v4: uuidv4 } = require('uuid');

class Hub {
  constructor(data) {
    this.id = data.id || uuidv4();
    this['@type'] = data['@type'] || 'Hub';
    this['@baseType'] = data['@baseType'] || 'hub';
    this['@schemaLocation'] = data['@schemaLocation'];
    this.href = data.href || `/tmf-api/event/v4/hub/${this.id}`;
    
    this.callback = data.callback;
    this.query = data.query;
  }

  isValid() {
    return this.callback;
  }

  toJSON() {
    return {
      id: this.id,
      '@type': this['@type'],
      '@baseType': this['@baseType'],
      '@schemaLocation': this['@schemaLocation'],
      href: this.href,
      callback: this.callback,
      query: this.query
    };
  }
}

module.exports = Hub;