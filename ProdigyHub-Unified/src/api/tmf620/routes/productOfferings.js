// src/routes/productOfferings.js - FIXED TO PRESERVE MONGODB EXTENSIONS
const express = require('express');
const router = express.Router();

let productOfferings = [];
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
  
  result['@type'] = data['@type'];
  result['id'] = data['id'];
  result['href'] = data['href'];
  
  return result;
};

const ensureNestedTypes = (data) => {
  const result = { ...data };
  
  // Ensure all arrays exist even if empty
  const requiredArrays = [
    'agreement', 'allowedAction', 'attachment', 'bundledGroupProductOffering',
    'bundledProductOffering', 'category', 'channel', 'marketSegment', 'place',
    'policy', 'prodSpecCharValueUse', 'productOfferingCharacteristic',
    'productOfferingPrice', 'productOfferingRelationship', 'productOfferingTerm'
  ];
  
  requiredArrays.forEach(arrayName => {
    if (!Array.isArray(result[arrayName])) {
      result[arrayName] = [];
    }
  });
  
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
  
  // Fix agreement array
  if (Array.isArray(result.agreement)) {
    result.agreement = result.agreement.map(agr => ({
      ...agr,
      '@type': 'AgreementRef',
      '@referredType': 'Agreement',
      href: agr.href || `http://localhost:3000/tmf-api/agreementManagement/v5/agreement/${agr.id || '1'}`,
      id: agr.id || '1'
    }));
  }
  
  // Fix allowedAction array
  if (Array.isArray(result.allowedAction)) {
    result.allowedAction = result.allowedAction.map(action => ({
      ...action,
      '@type': 'AllowedProductAction',
      channel: Array.isArray(action.channel) ? action.channel.map(ch => ({
        ...ch,
        '@type': 'ChannelRef',
        '@referredType': 'Channel',
        href: ch.href || `http://localhost:3000/tmf-api/salesChannelManagement/v5/channel/${ch.id || '1'}`,
        id: ch.id || '1'
      })) : []
    }));
  }
  
  // Fix attachment array
  if (Array.isArray(result.attachment)) {
    result.attachment = result.attachment.map(att => ({
      ...att,
      '@type': 'AttachmentRefOrValue',
      '@referredType': 'Attachment',
      href: att.href || `http://localhost:3000/tmf-api/documentManagement/v5/attachment/${att.id || '1'}`,
      id: att.id || '1',
      mimeType: att.mimeType || 'application/pdf',
      attachmentType: att.attachmentType || 'document',
      size: att.size || {
        amount: 1024,
        units: 'bytes'
      }
    }));
  }
  
  // Fix bundledGroupProductOffering array
  if (Array.isArray(result.bundledGroupProductOffering)) {
    result.bundledGroupProductOffering = result.bundledGroupProductOffering.map(group => ({
      ...group,
      '@type': 'BundledGroupProductOffering',
      name: group.name || 'Default Group',
      bundledGroupProductOfferingOption: group.bundledGroupProductOfferingOption || {
        '@type': 'BundledGroupProductOfferingOption',
        numberRelOfferLowerLimit: 1,
        numberRelOfferUpperLimit: 10
      },
      bundledProductOffering: Array.isArray(group.bundledProductOffering) 
        ? group.bundledProductOffering.map(bundle => ({
            ...bundle,
            '@type': 'BundledProductOfferingRef',
            '@referredType': 'ProductOffering',
            href: bundle.href || `http://localhost:3000/productCatalogManagement/v5/productOffering/${bundle.id || '1'}`,
            id: bundle.id || '1',
            name: bundle.name || 'Default Bundle',
            bundledProductOfferingOption: bundle.bundledProductOfferingOption || {
              '@type': 'BundledProductOfferingOption',
              numberRelOfferDefault: 1,
              numberRelOfferLowerLimit: 1,
              numberRelOfferUpperLimit: 5
            }
          }))
        : []
    }));
  }
  
  // Fix bundledProductOffering array
  if (Array.isArray(result.bundledProductOffering)) {
    result.bundledProductOffering = result.bundledProductOffering.map(bundle => ({
      ...bundle,
      '@type': 'BundledProductOfferingRef',
      '@referredType': 'ProductOffering',
      href: bundle.href || `http://localhost:3000/productCatalogManagement/v5/productOffering/${bundle.id || '1'}`,
      id: bundle.id || '1',
      name: bundle.name || 'Default Bundle',
      bundledProductOfferingOption: bundle.bundledProductOfferingOption || {
        '@type': 'BundledProductOfferingOption',
        numberRelOfferDefault: 1,
        numberRelOfferLowerLimit: 1,
        numberRelOfferUpperLimit: 5
      }
    }));
  }
  
  // Fix category array
  if (Array.isArray(result.category)) {
    result.category = result.category.map(cat => ({
      ...cat,
      '@type': 'CategoryRef',
      '@referredType': 'Category',
      href: cat.href || `http://localhost:3000/productCatalogManagement/v5/category/${cat.id || '1'}`,
      id: cat.id || '1',
      name: cat.name || 'Default Category'
    }));
  }
  
  // Fix channel array
  if (Array.isArray(result.channel)) {
    result.channel = result.channel.map(ch => ({
      ...ch,
      '@type': 'ChannelRef',
      '@referredType': 'Channel',
      href: ch.href || `http://localhost:3000/tmf-api/salesChannelManagement/v5/channel/${ch.id || '1'}`,
      id: ch.id || '1'
    }));
  }
  
  // Fix marketSegment array
  if (Array.isArray(result.marketSegment)) {
    result.marketSegment = result.marketSegment.map(seg => ({
      ...seg,
      '@type': 'MarketSegmentRef',
      '@referredType': 'MarketSegment',
      href: seg.href || `http://localhost:3000/tmf-api/marketSegmentManagement/v5/marketSegment/${seg.id || '1'}`,
      id: seg.id || '1'
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
  
  // Fix prodSpecCharValueUse array
  if (Array.isArray(result.prodSpecCharValueUse)) {
    result.prodSpecCharValueUse = result.prodSpecCharValueUse.map(use => ({
      ...use,
      '@type': 'ProductSpecificationCharacteristicValueUse',
      id: use.id || '1',
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
          '@type': 'ProductSpecification',
          '@schemaLocation': 'http://localhost:3000/schema/ProductSpecification.json'
        }
      }
    }));
  }
  
  // Fix productOfferingCharacteristic array
  if (Array.isArray(result.productOfferingCharacteristic)) {
    result.productOfferingCharacteristic = result.productOfferingCharacteristic.map(char => ({
      ...char,
      '@type': 'ProductOfferingCharacteristic',
      id: char.id || '1',
      name: char.name || 'Default Characteristic',
      valueType: char.valueType || 'string',
      characteristicValueSpecification: Array.isArray(char.characteristicValueSpecification)
        ? char.characteristicValueSpecification.map(val => ({
            ...val,
            '@type': val['@type'] || 'CharacteristicValueSpecification'
          }))
        : [],
      charSpecRelationship: Array.isArray(char.charSpecRelationship)
        ? char.charSpecRelationship.map(rel => ({
            ...rel,
            '@type': 'CharacteristicSpecificationRelationship',
            name: rel.name || 'Default Relationship',
            parentSpecificationId: rel.parentSpecificationId || '1',
            relationshipType: rel.relationshipType || 'dependency'
          }))
        : []
    }));
  }
  
  // Fix productOfferingPrice array
  if (Array.isArray(result.productOfferingPrice)) {
    result.productOfferingPrice = result.productOfferingPrice.map(price => ({
      ...price,
      '@type': 'ProductOfferingPriceRef',
      '@referredType': 'ProductOfferingPrice',
      href: price.href || `http://localhost:3000/productCatalogManagement/v5/productOfferingPrice/${price.id || '1'}`,
      id: price.id || '1',
      name: price.name || 'Default Price'
    }));
  }
  
  // Fix productOfferingRelationship array
  if (Array.isArray(result.productOfferingRelationship)) {
    result.productOfferingRelationship = result.productOfferingRelationship.map(rel => ({
      ...rel,
      '@type': 'ProductOfferingRelationship',
      '@referredType': 'ProductOffering',
      href: rel.href || `http://localhost:3000/productCatalogManagement/v5/productOffering/${rel.id || '1'}`,
      id: rel.id || '1'
    }));
  }
  
  // Fix productSpecification
  if (result.productSpecification) {
    result.productSpecification = {
      ...result.productSpecification,
      '@type': 'ProductSpecificationRef',
      '@referredType': 'ProductSpecification',
      href: result.productSpecification.href || `http://localhost:3000/productCatalogManagement/v5/productSpecification/${result.productSpecification.id || '1'}`,
      id: result.productSpecification.id || '1',
      name: result.productSpecification.name || 'Default Spec',
      targetProductSchema: result.productSpecification.targetProductSchema || {
        '@type': 'ProductSpecification',
        '@schemaLocation': 'http://localhost:3000/schema/ProductSpecification.json'
      }
    };
  }
  
  // Fix resourceCandidate
  if (result.resourceCandidate) {
    result.resourceCandidate = {
      ...result.resourceCandidate,
      '@type': 'ResourceCandidateRef',
      '@referredType': 'ResourceCandidate',
      href: result.resourceCandidate.href || `http://localhost:3000/tmf-api/resourceCatalogManagement/v5/resourceCandidate/${result.resourceCandidate.id || '1'}`,
      id: result.resourceCandidate.id || '1'
    };
  }
  
  // Fix serviceCandidate
  if (result.serviceCandidate) {
    result.serviceCandidate = {
      ...result.serviceCandidate,
      '@type': 'ServiceCandidateRef',
      '@referredType': 'ServiceCandidate',
      href: result.serviceCandidate.href || `http://localhost:3000/tmf-api/serviceCatalogManagement/v5/serviceCandidate/${result.serviceCandidate.id || '1'}`,
      id: result.serviceCandidate.id || '1'
    };
  }
  
  // Fix serviceLevelAgreement
  if (result.serviceLevelAgreement && Object.keys(result.serviceLevelAgreement).length > 0) {
    const hasContent = Object.keys(result.serviceLevelAgreement).some(key => 
      key !== '@type' && result.serviceLevelAgreement[key]
    );
    if (hasContent) {
      result.serviceLevelAgreement = {
        ...result.serviceLevelAgreement,
        '@type': 'ServiceLevelAgreementRef',
        '@referredType': 'ServiceLevelAgreement',
        href: result.serviceLevelAgreement.href || `http://localhost:3000/tmf-api/slaManagement/v5/sla/${result.serviceLevelAgreement.id || '1'}`,
        id: result.serviceLevelAgreement.id || '1'
      };
    } else {
      delete result.serviceLevelAgreement;
    }
  } else {
    delete result.serviceLevelAgreement;
  }
  
  return result;
};

const createProductOfferingResponse = (data) => {
  const id = data.id || (idCounter++).toString();
  
  const result = {
    id,
    href: `/productCatalogManagement/v5/productOffering/${id}`,
    name: data.name || 'Default Product Offering',
    description: data.description || '',
    version: data.version || '1.0',
    isBundle: data.isBundle || false,
    isSellable: data.isSellable !== undefined ? data.isSellable : true,
    lifecycleStatus: data.lifecycleStatus || 'Active',
    statusReason: data.statusReason || '',
    validFor: data.validFor || {},
    lastUpdate: new Date().toISOString(),
    
    // Initialize all required arrays
    agreement: [],
    allowedAction: [],
    attachment: [],
    bundledGroupProductOffering: [],
    bundledProductOffering: [],
    category: [],
    channel: [],
    marketSegment: [],
    place: [],
    policy: [],
    prodSpecCharValueUse: [],
    productOfferingCharacteristic: [],
    productOfferingPrice: [],
    productOfferingRelationship: [],
    productOfferingTerm: [],
    
    // ✅ CRITICAL FIX: Preserve MongoDB Extensions
    customAttributes: data.customAttributes || [],
    pricing: data.pricing || null,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
    extendedData: data.extendedData || null,
    
    '@type': 'ProductOffering'
  };
  
  // Process input arrays with proper structure
  if (Array.isArray(data.productOfferingTerm)) {
    result.productOfferingTerm = data.productOfferingTerm.map(term => ({
      ...term,
      '@type': 'ProductOfferingTerm',
      duration: term.duration || {
        amount: 12,
        units: 'Month'
      }
    }));
  }
  
  if (Array.isArray(data.category)) {
    result.category = data.category.map(cat => ({
      ...cat,
      '@type': 'CategoryRef',
      '@referredType': 'Category',
      href: cat.href || `http://localhost:3000/productCatalogManagement/v5/category/${cat.id || '1'}`,
      id: cat.id || '1',
      name: cat.name || 'Default Category'
    }));
  }
  
  if (Array.isArray(data.productOfferingPrice)) {
    result.productOfferingPrice = data.productOfferingPrice.map(price => ({
      ...price,
      '@type': 'ProductOfferingPriceRef',
      '@referredType': 'ProductOfferingPrice',
      href: price.href || `http://localhost:3000/productCatalogManagement/v5/productOfferingPrice/${price.id || '1'}`,
      id: price.id || '1',
      name: price.name || 'Default Price'
    }));
  }
  
  // Handle other arrays similarly...
  if (Array.isArray(data.attachment)) {
    result.attachment = data.attachment.map(att => ({
      ...att,
      '@type': 'AttachmentRefOrValue',
      '@referredType': 'Attachment',
      href: att.href || `http://localhost:3000/tmf-api/documentManagement/v5/attachment/${att.id || '1'}`,
      id: att.id || '1',
      mimeType: att.mimeType || 'application/pdf'
    }));
  }
  
  if (Array.isArray(data.marketSegment)) {
    result.marketSegment = data.marketSegment.map(seg => ({
      ...seg,
      '@type': 'MarketSegmentRef',
      '@referredType': 'MarketSegment',
      href: seg.href || `http://localhost:3000/tmf-api/marketSegmentManagement/v5/marketSegment/${seg.id || '1'}`,
      id: seg.id || '1'
    }));
  }
  
  // Handle productSpecification
  if (data.productSpecification) {
    result.productSpecification = {
      ...data.productSpecification,
      '@type': 'ProductSpecificationRef',
      '@referredType': 'ProductSpecification',
      href: data.productSpecification.href || `http://localhost:3000/productCatalogManagement/v5/productSpecification/${data.productSpecification.id || '1'}`,
      id: data.productSpecification.id || '1',
      name: data.productSpecification.name || 'Default Spec',
      targetProductSchema: data.productSpecification.targetProductSchema || {
        '@type': 'ProductSpecification',
        '@schemaLocation': 'http://localhost:3000/schema/ProductSpecification.json'
      }
    };
  }
  
  // Handle serviceLevelAgreement
  if (data.serviceLevelAgreement && Object.keys(data.serviceLevelAgreement).length > 0) {
    const hasContent = Object.keys(data.serviceLevelAgreement).some(key => 
      key !== '@type' && data.serviceLevelAgreement[key]
    );
    if (hasContent) {
      result.serviceLevelAgreement = {
        ...data.serviceLevelAgreement,
        '@type': 'ServiceLevelAgreementRef',
        '@referredType': 'ServiceLevelAgreement',
        href: data.serviceLevelAgreement.href || `http://localhost:3000/tmf-api/slaManagement/v5/sla/${data.serviceLevelAgreement.id || '1'}`,
        id: data.serviceLevelAgreement.id || '1'
      };
    }
  }
  
  return result;
};

// Routes remain the same structure but use the enhanced functions
router.get('/', (req, res, next) => {
  try {
    const { fields, ...filters } = req.query;
    let results = productOfferings.map(offering => ensureNestedTypes(offering));
    
    if (Object.keys(filters).length > 0) {
      results = results.filter(offering => {
        return Object.entries(filters).every(([key, value]) => {
          return offering[key] === value;
        });
      });
    }
    
    if (fields) {
      results = results.map(offering => applyFieldSelection(offering, fields));
    }
    
    res.status(200).json(results);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const { fields } = req.query;
    let offering = productOfferings.find(p => p.id === req.params.id);

    if (!offering) {
      return res.status(404).json({
        success: false,
        error: 'Product offering not found'
      });
    }

    offering = ensureNestedTypes(offering);

    if (fields) {
      offering = applyFieldSelection(offering, fields);
    }

    res.status(200).json(offering);
  } catch (error) {
    next(error);
  }
});

router.post('/', (req, res, next) => {
  try {
    console.log('📥 Backend received offering data:', JSON.stringify(req.body, null, 2));
    
    const offering = createProductOfferingResponse(req.body);
    
    console.log('📦 Backend storing offering with MongoDB extensions:', {
      id: offering.id,
      name: offering.name,
      hasCustomAttributes: !!offering.customAttributes,
      hasPricing: !!offering.pricing,
      customAttributesCount: offering.customAttributes?.length || 0,
      pricingAmount: offering.pricing?.amount || 'Not set'
    });
    
    productOfferings.push(offering);
    res.status(201).json(offering);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', (req, res, next) => {
  try {
    const index = productOfferings.findIndex(p => p.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Product offering not found'
      });
    }

    console.log('📝 Backend updating offering with data:', JSON.stringify(req.body, null, 2));

    let updatedOffering = {
      ...productOfferings[index],
      ...req.body,
      id: productOfferings[index].id,
      href: productOfferings[index].href,
      lastUpdate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      '@type': 'ProductOffering'
    };

    // ✅ CRITICAL FIX: Ensure MongoDB Extensions are preserved during updates
    if (req.body.customAttributes) {
      updatedOffering.customAttributes = req.body.customAttributes;
    }
    if (req.body.pricing) {
      updatedOffering.pricing = req.body.pricing;
    }
    if (req.body.extendedData) {
      updatedOffering.extendedData = req.body.extendedData;
    }

    // Ensure all arrays are properly structured during update
    updatedOffering = ensureNestedTypes(updatedOffering);
    
    console.log('📦 Backend updated offering preserving MongoDB extensions:', {
      id: updatedOffering.id,
      name: updatedOffering.name,
      hasCustomAttributes: !!updatedOffering.customAttributes,
      hasPricing: !!updatedOffering.pricing,
      customAttributesCount: updatedOffering.customAttributes?.length || 0,
      pricingAmount: updatedOffering.pricing?.amount || 'Not set'
    });
    
    productOfferings[index] = updatedOffering;
    res.status(200).json(updatedOffering);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const index = productOfferings.findIndex(p => p.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Product offering not found'
      });
    }

    productOfferings.splice(index, 1);
    res.status(204).json();
  } catch (error) {
    next(error);
  }
});

module.exports = router;