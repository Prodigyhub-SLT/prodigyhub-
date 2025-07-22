// Sample data for testing TMF622 Product Ordering API

const sampleProductOrder1 = {
  "category": "B2C product order",
  "description": "Product Order illustration sample",
  "priority": "1",
  "requestedCompletionDate": "2024-05-02T08:13:59.506Z",
  "requestedStartDate": "2024-05-03T08:13:59.506Z",
  "channel": [
    {
      "role": "Used channel for order capture",
      "channel": {
        "id": "1",
        "name": "Online channel",
        "@type": "ChannelRef"
      },
      "@type": "RelatedChannel"
    }
  ],
  "externalId": [
    {
      "owner": "TMF",
      "externalIdentifierType": "POnumber",
      "id": "456",
      "@type": "ExternalIdentifier"
    }
  ],
  "note": [
    {
      "id": "1",
      "author": "Jean Pontus",
      "text": "This is a TMF product order illustration",
      "@type": "Note"
    }
  ],
  "productOrderItem": [
    {
      "id": "100",
      "quantity": 1,
      "action": "add",
      "productOffering": {
        "id": "14277",
        "name": "TMF25",
        "@type": "ProductOfferingRef"
      },
      "productOrderItemRelationship": [
        {
          "id": "110",
          "relationshipType": "bundles",
          "@type": "OrderItemRelationship"
        },
        {
          "id": "120",
          "relationshipType": "bundles",
          "@type": "OrderItemRelationship"
        }
      ],
      "@type": "ProductOrderItem"
    },
    {
      "id": "110",
      "quantity": 1,
      "action": "add",
      "itemPrice": [
        {
          "description": "Access Fee",
          "name": "Access Fee",
          "priceType": "oneTime",
          "price": {
            "taxRate": 0,
            "dutyFreeAmount": {
              "unit": "LKR",
              "value": 2500
            },
            "taxIncludedAmount": {
              "unit": "LKR",
              "value": 2500
            },
            "@type": "Price"
          },
          "@type": "OrderPrice"
        }
      ],
      "product": {
        "isBundle": false,
        "productCharacteristic": [
          {
            "name": "TEL_MSISDN",
            "id": "Char6",
            "value": "0771234567",
            "valueType": "string",
            "@type": "StringCharacteristic"
          }
        ],
        "productSpecification": {
          "id": "14307",
          "name": "Mobile Telephony",
          "version": "1",
          "@type": "ProductSpecificationRef"
        },
        "@type": "Product"
      },
      "productOffering": {
        "id": "14305",
        "name": "TMF Mobile Telephony",
        "@type": "ProductOfferingRef"
      },
      "@type": "ProductOrderItem"
    },
    {
      "id": "120",
      "quantity": 1,
      "action": "add",
      "billingAccount": {
        "id": "1513",
        "name": "John Doe Billing Account",
        "@type": "BillingAccountRef"
      },
      "itemPrice": [
        {
          "description": "Monthly plan fee",
          "name": "MonthlyFee",
          "priceType": "recurring",
          "recurringChargePeriod": "month",
          "price": {
            "taxRate": 0,
            "dutyFreeAmount": {
              "unit": "LKR",
              "value": 1500
            },
            "taxIncludedAmount": {
              "unit": "LKR",
              "value": 1500
            },
            "@type": "Price"
          },
          "priceAlteration": [
            {
              "applicationDuration": 3,
              "description": "20% discount for first 3 months",
              "name": "WelcomeDiscount",
              "priceType": "recurring",
              "priority": 1,
              "recurringChargePeriod": "month",
              "price": {
                "percentage": 20,
                "taxRate": 0,
                "@type": "Price"
              },
              "@type": "PriceAlteration"
            }
          ],
          "@type": "OrderPrice"
        }
      ],
      "itemTerm": [
        {
          "description": "Mobile plan 12 Months commitment",
          "name": "12Months",
          "duration": {
            "amount": 12,
            "units": "month",
            "@type": "Duration"
          },
          "@type": "OrderTerm"
        }
      ],
      "product": {
        "isBundle": false,
        "productSpecification": {
          "id": "14395",
          "name": "TMF Mobile Plan",
          "version": "1",
          "@type": "ProductSpecificationRef"
        },
        "@type": "Product"
      },
      "productOffering": {
        "id": "14344",
        "name": "TMF Mobile Plan",
        "@type": "ProductOfferingRef"
      },
      "productOrderItemRelationship": [
        {
          "id": "110",
          "relationshipType": "reliesOn",
          "@type": "OrderItemRelationship"
        }
      ],
      "@type": "ProductOrderItem"
    }
  ],
  "relatedParty": [
    {
      "role": "seller",
      "partyOrPartyRole": {
        "id": "456-dd-df45",
        "name": "ProdigyHub Telecom",
        "@type": "PartyRef",
        "@referredType": "Organization"
      },
      "@type": "RelatedPartyRefOrPartyRoleRef"
    },
    {
      "role": "customer",
      "partyOrPartyRole": {
        "id": "ff55-hjy4",
        "name": "John Doe",
        "@type": "PartyRoleRef",
        "@referredType": "Customer"
      },
      "@type": "RelatedPartyRefOrPartyRoleRef"
    }
  ],
  "@type": "ProductOrder"
};

const sampleProductOrder2 = {
  "category": "B2B product order",
  "description": "Enterprise fiber connection order",
  "priority": "2",
  "requestedCompletionDate": "2024-06-15T10:00:00.000Z",
  "requestedStartDate": "2024-06-10T08:00:00.000Z",
  "productOrderItem": [
    {
      "id": "200",
      "quantity": 1,
      "action": "add",
      "product": {
        "isBundle": false,
        "productCharacteristic": [
          {
            "name": "Bandwidth",
            "id": "BW001",
            "value": 1000,
            "valueType": "integer",
            "@type": "IntegerCharacteristic"
          },
          {
            "name": "ServiceLevel",
            "id": "SL001",
            "value": "Premium",
            "valueType": "string",
            "@type": "StringCharacteristic"
          },
          {
            "name": "RedundancyRequired",
            "id": "RR001",
            "value": true,
            "valueType": "boolean",
            "@type": "BooleanCharacteristic"
          }
        ],
        "productSpecification": {
          "id": "FIBER001",
          "name": "Enterprise Fiber Connection",
          "version": "2.0",
          "@type": "ProductSpecificationRef"
        },
        "@type": "Product"
      },
      "productOffering": {
        "id": "EFC1000",
        "name": "Enterprise Fiber 1Gbps",
        "@type": "ProductOfferingRef"
      },
      "itemPrice": [
        {
          "description": "Monthly subscription for 1Gbps fiber",
          "name": "MonthlySubscription",
          "priceType": "recurring",
          "recurringChargePeriod": "month",
          "price": {
            "taxRate": 15,
            "dutyFreeAmount": {
              "unit": "LKR",
              "value": 50000
            },
            "taxIncludedAmount": {
              "unit": "LKR",
              "value": 57500
            },
            "@type": "Price"
          },
          "@type": "OrderPrice"
        },
        {
          "description": "One-time installation fee",
          "name": "InstallationFee",
          "priceType": "oneTime",
          "price": {
            "taxRate": 15,
            "dutyFreeAmount": {
              "unit": "LKR",
              "value": 25000
            },
            "taxIncludedAmount": {
              "unit": "LKR",
              "value": 28750
            },
            "@type": "Price"
          },
          "@type": "OrderPrice"
        }
      ],
      "@type": "ProductOrderItem"
    }
  ],
  "relatedParty": [
    {
      "role": "customer",
      "partyOrPartyRole": {
        "id": "ent-001",
        "name": "ABC Corporation Ltd",
        "@type": "PartyRef",
        "@referredType": "Organization"
      },
      "@type": "RelatedPartyRefOrPartyRoleRef"
    }
  ],
  "@type": "ProductOrder"
};

const sampleCancelProductOrder = {
  "cancellationReason": "Customer changed requirements",
  "requestedCancellationDate": "2024-05-01T12:00:00.000Z",
  "productOrder": {
    "id": "will-be-replaced-with-actual-order-id",
    "@type": "ProductOrderRef",
    "@referredType": "ProductOrder"
  },
  "@type": "CancelProductOrder"
};

// Configuration product order with complex characteristics
const sampleConfigurableProductOrder = {
  "category": "B2C product order",
  "description": "Configurable broadband package order",
  "priority": "3",
  "requestedCompletionDate": "2024-05-20T15:30:00.000Z",
  "productOrderItem": [
    {
      "id": "300",
      "quantity": 1,
      "action": "add",
      "product": {
        "isBundle": true,
        "productCharacteristic": [
          {
            "name": "InternetSpeed",
            "id": "IS001",
            "value": {
              "downloadSpeed": 100,
              "uploadSpeed": 20,
              "unit": "Mbps"
            },
            "valueType": "object",
            "@type": "ObjectCharacteristic"
          },
          {
            "name": "DataAllowance",
            "id": "DA001",
            "value": "unlimited",
            "valueType": "string",
            "@type": "StringCharacteristic"
          },
          {
            "name": "AddOnServices",
            "id": "AOS001",
            "value": ["WiFi Router", "Static IP", "Email Hosting"],
            "valueType": "stringArray",
            "@type": "StringArrayCharacteristic"
          },
          {
            "name": "ContractPeriod",
            "id": "CP001",
            "value": 24,
            "valueType": "integer",
            "@type": "IntegerCharacteristic"
          }
        ],
        "productSpecification": {
          "id": "BROAD001",
          "name": "Configurable Broadband Package",
          "version": "3.1",
          "@type": "ProductSpecificationRef"
        },
        "@type": "Product"
      },
      "productOffering": {
        "id": "CBP100",
        "name": "Broadband 100Mbps Package",
        "@type": "ProductOfferingRef"
      },
      "@type": "ProductOrderItem"
    }
  ],
  "relatedParty": [
    {
      "role": "customer",
      "partyOrPartyRole": {
        "id": "cust-789",
        "name": "Jane Smith",
        "@type": "PartyRoleRef",
        "@referredType": "Customer"
      },
      "@type": "RelatedPartyRefOrPartyRoleRef"
    }
  ],
  "@type": "ProductOrder"
};

module.exports = {
  sampleProductOrder1,
  sampleProductOrder2,
  sampleCancelProductOrder,
  sampleConfigurableProductOrder
};