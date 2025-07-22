// src/routes/productOfferingPrices.js - ENHANCED FOR CTK COMPLIANCE
const express = require('express');
const router = express.Router();

let productOfferingPrices = [];
let idCounter = 1;

const applyFieldSelection = (data, fields) => {
  if (!fields) return data;
  
  const selectedFields = fields.split(',').map(f => f.trim());
  const result = {};
  
  selectedFields.forEach(field => {
    if (data[field] !== undefined) {
      result[field] = data[field];
    }
  });
  
  // Always include @type, id, and href for schema validation
  result['@type'] = data['@type'];
  result['id'] = data['id'];
  result['href'] = data['href'];
  
  return result;
};

const ensureNestedTypes = (data) => {
  const result = { ...data };
  
  // Ensure all required arrays exist
  const requiredArrays = [
    'bundledPopRelationship', 'place', 'policy', 'popRelationship',
    'pricingLogicAlgorithm', 'prodSpecCharValueUse', 'productOfferingTerm', 'tax'
  ];
  
  requiredArrays.forEach(arrayName => {
    if (!Array.isArray(result[arrayName])) {
      result[arrayName] = [];
    }
  });
  
  // Fix bundledPopRelationship array
  if (Array.isArray(result.bundledPopRelationship)) {
    result.bundledPopRelationship = result.bundledPopRelationship.map(rel => ({
      ...rel,
      '@type': 'BundledProductOfferingPriceRelationship',
      '@referredType': 'ProductOfferingPrice',
      href: rel.href || `http://localhost:3000/productCatalogManagement/v5/productOfferingPrice/${rel.id || '1'}`,
      id: rel.id || '1'
    }));
  }
  
  // Fix place array
  if (Array.isArray(result.place)) {
    result.place = result.place.map(pl => ({
      ...pl,
      '@type': 'PlaceRef',
      '@referredType': 'GeographicAddress',
      href: pl.href || `http://localhost:3000/tmf-api/geographicAddressManagement/v5/geographicAddress/${pl.id || '1'}`,
      id: pl.id || '1'
    }));
  }
  
  // Fix policy array
  if (Array.isArray(result.policy)) {
    result.policy = result.policy.map(pol => ({
      ...pol,
      '@type': 'PolicyRef',
      '@referredType': 'Policy',
      href: pol.href || `http://localhost:3000/tmf-api/policyManagement/v5/policy/${pol.id || '1'}`,
      id: pol.id || '1'
    }));
  }
  
  // Fix popRelationship array
  if (Array.isArray(result.popRelationship)) {
    result.popRelationship = result.popRelationship.map(rel => ({
      ...rel,
      '@type': 'ProductOfferingPriceRelationship',
      '@referredType': 'ProductOfferingPrice',
      href: rel.href || `http://localhost:3000/productCatalogManagement/v5/productOfferingPrice/${rel.id || '1'}`,
      id: rel.id || '1'
    }));
  }
  
  // Fix pricingLogicAlgorithm array
  if (Array.isArray(result.pricingLogicAlgorithm)) {
    result.pricingLogicAlgorithm = result.pricingLogicAlgorithm.map(alg => ({
      ...alg,
      '@type': 'PricingLogicAlgorithm',
      href: alg.href || `http://localhost:3000/tmf-api/pricingManagement/v5/pricingLogicAlgorithm/${alg.id || '1'}`,
      id: alg.id || '1'
    }));
  }
  
  // Fix prodSpecCharValueUse array
  if (Array.isArray(result.prodSpecCharValueUse)) {
    result.prodSpecCharValueUse = result.prodSpecCharValueUse.map(use => ({
      ...use,
      '@type': 'ProductSpecificationCharacteristicValueUse',
      name: use.name || 'Default Characteristic',
      valueType: use.valueType || 'string',
      productSpecCharacteristicValue: Array.isArray(use.productSpecCharacteristicValue)
        ? use.productSpecCharacteristicValue.map(val => ({
            ...val,
            '@type': val['@type'] || 'CharacteristicValueSpecification',
            valueType: val.valueType || 'string'
          }))
        : [],
      productSpecification: use.productSpecification || {
        '@type': 'ProductSpecificationRef',
        '@referredType': 'ProductSpecification',
        href: `http://localhost:3000/productCatalogManagement/v5/productSpecification/1`,
        id: '1',
        name: 'Default Spec',
        targetProductSchema: {
          '@type': 'ProductSpecification'
        }
      }
    }));
  }
  
  // Fix productOfferingTerm array
  if (Array.isArray(result.productOfferingTerm)) {
    result.productOfferingTerm = result.productOfferingTerm.map(term => ({
      ...term,
      '@type': 'ProductOfferingTerm',
      duration: term.duration || {
        amount: 12,
        units: 'Month'
      }
    }));
  }
  
  // Fix tax array
  if (Array.isArray(result.tax)) {
    result.tax = result.tax.map(tax => ({
      ...tax,
      '@type': 'TaxItem',
      taxAmount: tax.taxAmount || {
        unit: 'USD',
        value: 0
      }
    }));
  }
  
  // Ensure required objects exist with proper structure
  if (!result.price) {
    result.price = {
      unit: 'USD',
      value: 0
    };
  }
  
  if (!result.unitOfMeasure) {
    result.unitOfMeasure = {
      amount: 1,
      units: 'each'
    };
  }
  
  return result;
};

const createProductOfferingPriceResponse = (data) => {
  const id = data.id || (idCounter++).toString();
  
  return {
    id,
    href: `/productCatalogManagement/v5/productOfferingPrice/${id}`,
    name: data.name || 'Default Product Offering Price',
    description: data.description || '',
    version: data.version || '1.0',
    isBundle: data.isBundle || false,
    lifecycleStatus: data.lifecycleStatus || 'Active',
    priceType: data.priceType || 'one-time',
    price: data.price || { 
      unit: 'USD', 
      value: 0 
    },
    percentage: data.percentage || 0,
    recurringChargePeriodType: data.recurringChargePeriodType || '',
    recurringChargePeriodLength: data.recurringChargePeriodLength || 1,
    unitOfMeasure: data.unitOfMeasure || {
      amount: 1,
      units: 'each'
    },
    validFor: data.validFor || {},
    lastUpdate: new Date().toISOString(),
    
    // Initialize all required arrays
    bundledPopRelationship: [],
    place: [],
    policy: [],
    popRelationship: [],
    pricingLogicAlgorithm: [],
    prodSpecCharValueUse: [],
    productOfferingTerm: [],
    tax: [],
    
    '@type': 'ProductOfferingPrice'
  };
};

// GET all prices
router.get('/', (req, res, next) => {
  try {
    const { fields, ...filters } = req.query;
    let results = productOfferingPrices.map(price => ensureNestedTypes(price));
    
    if (Object.keys(filters).length > 0) {
      results = results.filter(price => {
        return Object.entries(filters).every(([key, value]) => {
          return price[key] === value;
        });
      });
    }
    
    if (fields) {
      results = results.map(price => applyFieldSelection(price, fields));
    }
    
    res.status(200).json(results);
  } catch (error) {
    next(error);
  }
});

// GET single price
router.get('/:id', (req, res, next) => {
  try {
    const { fields } = req.query;
    let price = productOfferingPrices.find(p => p.id === req.params.id);

    if (!price) {
      return res.status(404).json({
        success: false,
        error: 'Product offering price not found'
      });
    }

    price = ensureNestedTypes(price);

    if (fields) {
      price = applyFieldSelection(price, fields);
    }

    res.status(200).json(price);
  } catch (error) {
    next(error);
  }
});

// POST new price
router.post('/', (req, res, next) => {
  try {
    const price = createProductOfferingPriceResponse(req.body);
    
    // Process input data arrays properly
    if (Array.isArray(req.body.productOfferingTerm)) {
      price.productOfferingTerm = req.body.productOfferingTerm.map(term => ({
        ...term,
        '@type': 'ProductOfferingTerm',
        duration: term.duration || {
          amount: 12,
          units: 'Month'
        }
      }));
    }
    
    if (Array.isArray(req.body.place)) {
      price.place = req.body.place.map(pl => ({
        ...pl,
        '@type': 'PlaceRef',
        '@referredType': 'GeographicAddress',
        href: pl.href || `http://localhost:3000/tmf-api/geographicAddressManagement/v5/geographicAddress/${pl.id || '1'}`,
        id: pl.id || '1'
      }));
    }
    
    if (Array.isArray(req.body.tax)) {
      price.tax = req.body.tax.map(tax => ({
        ...tax,
        '@type': 'TaxItem',
        taxAmount: tax.taxAmount || {
          unit: 'USD',
          value: 0
        }
      }));
    }
    
    // Apply full enhancement
    const enhancedPrice = ensureNestedTypes(price);
    productOfferingPrices.push(enhancedPrice);
    res.status(201).json(enhancedPrice);
  } catch (error) {
    next(error);
  }
});

// PATCH existing price
router.patch('/:id', (req, res, next) => {
  try {
    const index = productOfferingPrices.findIndex(p => p.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Product offering price not found'
      });
    }

    let updatedPrice = {
      ...productOfferingPrices[index],
      ...req.body,
      id: productOfferingPrices[index].id,
      href: productOfferingPrices[index].href,
      lastUpdate: new Date().toISOString(),
      '@type': 'ProductOfferingPrice'
    };

    // Handle arrays with proper @type assignment during update
    const arrayFields = [
      { 
        field: 'productOfferingTerm', 
        handler: (terms) => terms.map(term => ({
          ...term,
          '@type': 'ProductOfferingTerm',
          duration: term.duration || {
            amount: 12,
            units: 'Month'
          }
        }))
      },
      { 
        field: 'tax', 
        handler: (taxes) => taxes.map(tax => ({
          ...tax,
          '@type': 'TaxItem',
          taxAmount: tax.taxAmount || {
            unit: 'USD',
            value: 0
          }
        }))
      },
      { 
        field: 'place', 
        handler: (places) => places.map(pl => ({
          ...pl,
          '@type': 'PlaceRef',
          '@referredType': 'GeographicAddress',
          href: pl.href || `http://localhost:3000/tmf-api/geographicAddressManagement/v5/geographicAddress/${pl.id || '1'}`,
          id: pl.id || '1'
        }))
      },
      { 
        field: 'bundledPopRelationship', 
        handler: (rels) => rels.map(rel => ({
          ...rel,
          '@type': 'BundledProductOfferingPriceRelationship',
          '@referredType': 'ProductOfferingPrice',
          href: rel.href || `http://localhost:3000/productCatalogManagement/v5/productOfferingPrice/${rel.id || '1'}`,
          id: rel.id || '1'
        }))
      },
      { 
        field: 'policy', 
        handler: (policies) => policies.map(pol => ({
          ...pol,
          '@type': 'PolicyRef',
          '@referredType': 'Policy',
          href: pol.href || `http://localhost:3000/tmf-api/policyManagement/v5/policy/${pol.id || '1'}`,
          id: pol.id || '1'
        }))
      },
      { 
        field: 'popRelationship', 
        handler: (rels) => rels.map(rel => ({
          ...rel,
          '@type': 'ProductOfferingPriceRelationship',
          '@referredType': 'ProductOfferingPrice',
          href: rel.href || `http://localhost:3000/productCatalogManagement/v5/productOfferingPrice/${rel.id || '1'}`,
          id: rel.id || '1'
        }))
      },
      { 
        field: 'pricingLogicAlgorithm', 
        handler: (algs) => algs.map(alg => ({
          ...alg,
          '@type': 'PricingLogicAlgorithm',
          href: alg.href || `http://localhost:3000/tmf-api/pricingManagement/v5/pricingLogicAlgorithm/${alg.id || '1'}`,
          id: alg.id || '1'
        }))
      },
      { 
        field: 'prodSpecCharValueUse', 
        handler: (uses) => uses.map(use => ({
          ...use,
          '@type': 'ProductSpecificationCharacteristicValueUse',
          name: use.name || 'Default Characteristic',
          valueType: use.valueType || 'string',
          productSpecCharacteristicValue: Array.isArray(use.productSpecCharacteristicValue)
            ? use.productSpecCharacteristicValue.map(val => ({
                ...val,
                '@type': val['@type'] || 'CharacteristicValueSpecification',
                valueType: val.valueType || 'string'
              }))
            : [],
          productSpecification: use.productSpecification || {
            '@type': 'ProductSpecificationRef',
            '@referredType': 'ProductSpecification',
            href: `http://localhost:3000/productCatalogManagement/v5/productSpecification/1`,
            id: '1',
            name: 'Default Spec',
            targetProductSchema: {
              '@type': 'ProductSpecification'
            }
          }
        }))
      }
    ];

    arrayFields.forEach(({ field, handler }) => {
      if (req.body[field] || productOfferingPrices[index][field]) {
        const items = req.body[field] || productOfferingPrices[index][field] || [];
        updatedPrice[field] = handler(items);
      }
    });

    // Ensure all mandatory fields and structures
    updatedPrice = ensureNestedTypes(updatedPrice);
    
    productOfferingPrices[index] = updatedPrice;
    res.status(200).json(updatedPrice);
  } catch (error) {
    next(error);
  }
});

// DELETE price
router.delete('/:id', (req, res, next) => {
  try {
    const index = productOfferingPrices.findIndex(p => p.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Product offering price not found'
      });
    }

    productOfferingPrices.splice(index, 1);
    res.status(204).json();
  } catch (error) {
    next(error);
  }
});

module.exports = router;