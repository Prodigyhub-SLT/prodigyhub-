const { v4: uuidv4 } = require('uuid');

class Topic {
  constructor(data) {
    this.id = data.id || uuidv4();
    this['@type'] = data['@type'] || 'Topic';
    this['@baseType'] = data['@baseType'] || 'topic';
    this['@schemaLocation'] = data['@schemaLocation'];
    this.href = data.href || `/tmf-api/event/v4/topic/${this.id}`;
    
    this.name = data.name;
    this.contentQuery = data.contentQuery;
    this.headerQuery = data.headerQuery;
  }

  isValid() {
    return this.name;
  }

  toJSON() {
    return {
      id: this.id,
      '@type': this['@type'],
      '@baseType': this['@baseType'],
      '@schemaLocation': this['@schemaLocation'],
      href: this.href,
      name: this.name,
      contentQuery: this.contentQuery,
      headerQuery: this.headerQuery
    };
  }
}

module.exports = Topic;