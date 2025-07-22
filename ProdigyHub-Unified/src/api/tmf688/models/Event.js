const { v4: uuidv4 } = require('uuid');

class Event {
  constructor(data) {
    this.id = data.id || uuidv4();
    this['@type'] = data['@type'] || 'Event';
    this['@baseType'] = data['@baseType'] || 'event';
    this['@schemaLocation'] = data['@schemaLocation'];
    this.href = data.href || `/tmf-api/event/v4/event/${this.id}`;
    
    // Core event properties
    this.eventId = data.eventId || uuidv4();
    this.eventTime = data.eventTime || new Date().toISOString();
    this.eventType = data.eventType;
    this.correlationId = data.correlationId;
    this.domain = data.domain;
    this.title = data.title;
    this.description = data.description;
    this.timeOccurred = data.timeOccurred || new Date().toISOString();
    this.priority = data.priority || 'Normal';
    
    // References
    this.source = data.source;
    this.reportingSystem = data.reportingSystem;
    this.relatedParty = data.relatedParty || [];
    
    // Event payload
    this.event = data.event;
    
    // Analytics characteristics
    this.analyticCharacteristic = data.analyticCharacteristic || [];
  }

  // Validation method
  isValid() {
    return this.eventType && this.event;
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      '@type': this['@type'],
      '@baseType': this['@baseType'],
      '@schemaLocation': this['@schemaLocation'],
      href: this.href,
      eventId: this.eventId,
      eventTime: this.eventTime,
      eventType: this.eventType,
      correlationId: this.correlationId,
      domain: this.domain,
      title: this.title,
      description: this.description,
      timeOccurred: this.timeOccurred,
      priority: this.priority,
      source: this.source,
      reportingSystem: this.reportingSystem,
      relatedParty: this.relatedParty,
      event: this.event,
      analyticCharacteristic: this.analyticCharacteristic
    };
  }
}

module.exports = Event;