// sltQualificationController.js - MongoDB backend controller for SLT Product Qualification
const { MongoClient, ObjectId } = require('mongodb');
const { applyFieldSelection, validateRequiredFields, cleanForJsonResponse } = require('../utils/helpers');

// MongoDB connection setup
let db;
let sltQualificationsCollection;
let infrastructureCollection;
let coverageDataCollection;

const connectToMongoDB = async () => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/prodigyhub');
    await client.connect();
    db = client.db('prodigyhub');
    
    // Initialize collections
    sltQualificationsCollection = db.collection('slt_qualifications');
    infrastructureCollection = db.collection('infrastructure_data');
    coverageDataCollection = db.collection('coverage_data');
    
    console.log('Connected to MongoDB for SLT Qualification service');
    
    // Create indexes for performance
    await createIndexes();
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};

const createIndexes = async () => {
  try {
    // Qualification collection indexes
    await sltQualificationsCollection.createIndex({ 'location.district': 1 });
    await sltQualificationsCollection.createIndex({ 'location.province': 1 });
    await sltQualificationsCollection.createIndex({ creationDate: -1 });
    await sltQualificationsCollection.createIndex({ qualificationResult: 1 });
    await sltQualificationsCollection.createIndex({ 'requestedServices': 1 });
    
    // Infrastructure collection indexes
    await infrastructureCollection.createIndex({ district: 1 });
    await infrastructureCollection.createIndex({ 'coordinates.lat': 1, 'coordinates.lng': 1 });
    
    // Coverage data indexes
    await coverageDataCollection.createIndex({ district: 1, technology: 1 });
    
    console.log('MongoDB indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
};

// Initialize connection
connectToMongoDB();

// Infrastructure checking logic
const checkInfrastructureAvailability = async (location) => {
  try {
    // Check infrastructure data from MongoDB
    const infrastructureData = await infrastructureCollection.findOne({
      district: location.district
    });

    // Get coverage data
    const fiberCoverage = await coverageDataCollection.findOne({
      district: location.district,
      technology: 'fiber'
    });

    const adslCoverage = await coverageDataCollection.findOne({
      district: location.district,
      technology: 'adsl'
    });

    // Calculate availability based on location and infrastructure
    const isUrbanArea = ['Colombo', 'Gampaha', 'Kandy', 'Negombo'].includes(location.district);
    const isWesternProvince = location.province === 'Western';

    // Fiber availability logic
    const fiberAvailable = infrastructureData?.fiber?.available || 
      (isUrbanArea && Math.random() > 0.2) || 
      (isWesternProvince && Math.random() > 0.4) || 
      Math.random() > 0.7;

    // ADSL availability logic - generally more widespread
    const adslAvailable = infrastructureData?.adsl?.available || 
      Math.random() > 0.15;

    // Mobile availability - almost universal
    const mobileAvailable = true;

    return {
      fiber: {
        available: fiberAvailable,
        technology: fiberAvailable ? (infrastructureData?.fiber?.technology || 'FTTH') : 'N/A',
        maxSpeed: fiberAvailable ? (infrastructureData?.fiber?.maxSpeed || '100 Mbps') : 'N/A',
        coverage: fiberAvailable ? 'full' : 'none',
        installationTime: fiberAvailable ? '3-5 business days' : undefined,
        monthlyFee: fiberAvailable ? (infrastructureData?.fiber?.monthlyFee || 2500) : undefined
      },
      adsl: {
        available: adslAvailable,
        technology: adslAvailable ? (infrastructureData?.adsl?.technology || 'ADSL2+') : 'N/A',
        maxSpeed: adslAvailable ? (infrastructureData?.adsl?.maxSpeed || '16 Mbps') : 'N/A',
        lineQuality: adslAvailable ? 
          (['excellent', 'good', 'fair'][Math.floor(Math.random() * 3)]) : 'poor',
        distanceFromExchange: adslAvailable ? Math.floor(Math.random() * 3000) + 500 : undefined,
        monthlyFee: adslAvailable ? (infrastructureData?.adsl?.monthlyFee || 1500) : undefined
      },
      mobile: {
        available: mobileAvailable,
        technologies: isUrbanArea ? ['4G', '5G'] : ['4G'],
        coverage: isUrbanArea ? 'Excellent' : (isWesternProvince ? 'Good' : 'Fair'),
        signalStrength: isUrbanArea ? 'excellent' : 'good'
      }
    };
  } catch (error) {
    console.error('Error checking infrastructure:', error);
    throw error;
  }
};

const sltQualificationController = {
  
  // POST /api/slt/checkLocation - Check location qualification
  checkLocation: async (req, res) => {
    try {
      const data = req.body;
      
      // Validation
      const validationError = validateRequiredFields(data, ['location', 'requestedServices', '@type']);
      if (validationError) {
        return res.status(400).json({
          error: 'Bad Request',
          message: validationError
        });
      }

      // Validate location data
      if (!data.location.address || !data.location.district || !data.location.province) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Location must include address, district, and province'
        });
      }

      // Generate qualification ID
      const qualificationId = `SLT-QUAL-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      
      // Check infrastructure availability
      const infrastructure = await checkInfrastructureAvailability(data.location);
      
      // Determine qualification result
      let qualificationResult = 'unqualified';
      const fiberRequested = data.requestedServices.some(s => s.toLowerCase().includes('fiber'));
      const adslRequested = data.requestedServices.some(s => s.toLowerCase().includes('adsl'));
      
      if (fiberRequested && infrastructure.fiber.available) {
        qualificationResult = 'qualified';
      } else if (adslRequested && infrastructure.adsl.available) {
        qualificationResult = 'qualified';
      } else if (infrastructure.fiber.available || infrastructure.adsl.available) {
        qualificationResult = 'conditional';
      }

      // Generate alternative options
      const alternativeOptions = [];
      if (qualificationResult === 'conditional') {
        if (infrastructure.adsl.available && !adslRequested) {
          alternativeOptions.push({
            service: 'ADSL Broadband',
            technology: infrastructure.adsl.technology,
            speed: infrastructure.adsl.maxSpeed,
            monthlyFee: infrastructure.adsl.monthlyFee,
            availability: 'Available'
          });
        }
        if (infrastructure.mobile.available) {
          alternativeOptions.push({
            service: 'Mobile Broadband',
            technology: infrastructure.mobile.technologies.join('/'),
            speed: 'Up to 150 Mbps',
            monthlyFee: 3000,
            availability: 'Available'
          });
        }
      }

      // Create qualification record
      const qualification = {
        _id: new ObjectId(),
        id: qualificationId,
        href: `/api/slt/qualifications/${qualificationId}`,
        state: 'done',
        creationDate: new Date().toISOString(),
        completionDate: new Date().toISOString(),
        location: data.location,
        infrastructure,
        requestedServices: data.requestedServices,
        qualificationResult,
        alternativeOptions: alternativeOptions.length > 0 ? alternativeOptions : undefined,
        estimatedInstallationTime: infrastructure.fiber.available ? '3-5 business days' : '1-2 business days',
        customerType: data.customerType || 'residential',
        checkParameters: {
          checkFiber: data.checkFiber || false,
          checkADSL: data.checkADSL || false,
          checkMobile: data.checkMobile || false,
          includeAlternatives: data.includeAlternatives || false
        },
        '@type': 'SLTLocationQualification'
      };

      // Save to MongoDB
      await sltQualificationsCollection.insertOne(qualification);
      
      // Return response (exclude MongoDB _id)
      const response = { ...qualification };
      delete response._id;
      
      res.status(201).json(cleanForJsonResponse(response));
    } catch (error) {
      console.error('Error in checkLocation:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  },

  // GET /api/slt/qualifications - List qualifications
  listQualifications: async (req, res) => {
    try {
      const { 
        fields, 
        province, 
        district, 
        serviceType, 
        status, 
        limit = 20, 
        offset = 0 
      } = req.query;

      // Build query
      const query = {};
      if (province) query['location.province'] = province;
      if (district) query['location.district'] = district;
      if (serviceType) query.requestedServices = { $in: [new RegExp(serviceType, 'i')] };
      if (status) query.qualificationResult = status;

      // Execute query with pagination
      const qualifications = await sltQualificationsCollection
        .find(query)
        .sort({ creationDate: -1 })
        .skip(parseInt(offset))
        .limit(parseInt(limit))
        .toArray();

      // Apply field selection if specified
      let result = qualifications.map(qual => {
        const cleaned = { ...qual };
        delete cleaned._id; // Remove MongoDB _id
        return cleaned;
      });

      if (fields) {
        result = result.map(qual => applyFieldSelection(qual, fields));
      } else {
        result = result.map(qual => cleanForJsonResponse(qual));
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in listQualifications:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  },

  // GET /api/slt/qualifications/{id} - Get qualification by ID
  getQualificationById: async (req, res) => {
    try {
      const { id } = req.params;
      const { fields } = req.query;

      const qualification = await sltQualificationsCollection.findOne({ id });
      
      if (!qualification) {
        return res.status(404).json({
          error: 'Not Found',
          message: `SLT qualification with id ${id} not found`
        });
      }

      // Remove MongoDB _id
      const result = { ...qualification };
      delete result._id;

      // Apply field selection if specified
      const response = fields ? 
        applyFieldSelection(result, fields) : 
        cleanForJsonResponse(result);

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getQualificationById:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  },

  // GET /api/slt/stats - Get qualification statistics
  getStats: async (req, res) => {
    try {
      const totalQualifications = await sltQualificationsCollection.countDocuments();
      
      const fiberAvailable = await sltQualificationsCollection.countDocuments({
        'infrastructure.fiber.available': true
      });
      
      const adslAvailable = await sltQualificationsCollection.countDocuments({
        'infrastructure.adsl.available': true
      });
      
      const bothAvailable = await sltQualificationsCollection.countDocuments({
        'infrastructure.fiber.available': true,
        'infrastructure.adsl.available': true
      });

      const qualified = await sltQualificationsCollection.countDocuments({
        qualificationResult: 'qualified'
      });

      // Calculate coverage by province
      const coverageByProvince = await sltQualificationsCollection.aggregate([
        {
          $group: {
            _id: '$location.province',
            total: { $sum: 1 },
            fiber: {
              $sum: {
                $cond: ['$infrastructure.fiber.available', 1, 0]
              }
            },
            adsl: {
              $sum: {
                $cond: ['$infrastructure.adsl.available', 1, 0]
              }
            }
          }
        }
      ]).toArray();

      const stats = {
        totalQualifications,
        fiberAvailable,
        adslAvailable,
        bothAvailable,
        neitherAvailable: totalQualifications - Math.max(fiberAvailable, adslAvailable),
        successRate: totalQualifications > 0 ? (qualified / totalQualifications) * 100 : 0,
        avgResponseTime: '4.2s', // Mock data - could be calculated from actual response times
        coverageByProvince: coverageByProvince.reduce((acc, item) => {
          acc[item._id] = {
            fiber: (item.fiber / item.total) * 100,
            adsl: (item.adsl / item.total) * 100,
            total: item.total
          };
          return acc;
        }, {})
      };

      res.status(200).json(stats);
    } catch (error) {
      console.error('Error in getStats:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  },

  // GET /api/slt/coverage - Get coverage map data
  getCoverage: async (req, res) => {
    try {
      const { province } = req.query;
      
      let query = {};
      if (province) {
        query.province = province;
      }

      const coverageData = await coverageDataCollection.find(query).toArray();

      const fiberCoverage = coverageData
        .filter(item => item.technology === 'fiber')
        .map(item => ({
          district: item.district,
          coverage: item.coverage || 0,
          technology: item.technologyType || 'FTTH'
        }));

      const adslCoverage = coverageData
        .filter(item => item.technology === 'adsl')
        .map(item => ({
          district: item.district,
          coverage: item.coverage || 0,
          maxSpeed: item.maxSpeed || '16 Mbps'
        }));

      res.status(200).json({
        fiberCoverage,
        adslCoverage
      });
    } catch (error) {
      console.error('Error in getCoverage:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  },

  // GET /api/slt/infrastructure/{district} - Get infrastructure details
  getInfrastructureDetails: async (req, res) => {
    try {
      const { district } = req.params;

      const infrastructure = await infrastructureCollection.findOne({ district });
      
      if (!infrastructure) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Infrastructure data for ${district} not found`
        });
      }

      const response = {
        fiberNetworks: infrastructure.fiberNetworks || [{
          type: 'FTTH',
          coverage: 75,
          capacity: '100 Gbps',
          lastUpgrade: '2023-06-15'
        }],
        adslExchanges: infrastructure.adslExchanges || [{
          name: `${district} Main Exchange`,
          location: district,
          capacity: 10000,
          technology: 'ADSL2+',
          coverageRadius: 3000
        }],
        mobileNetworks: infrastructure.mobileNetworks || [{
          operator: 'SLT Mobitel',
          technologies: ['4G', '5G'],
          coverage: 95
        }]
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getInfrastructureDetails:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  },

  // POST /api/slt/packages - Get available packages for location
  getAvailablePackages: async (req, res) => {
    try {
      const { location } = req.body;
      
      if (!location || !location.district) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Location with district is required'
        });
      }

      const infrastructure = await checkInfrastructureAvailability(location);
      const packages = [];

      // Fiber packages
      if (infrastructure.fiber.available) {
        packages.push(
          {
            id: 'FIB-100',
            name: 'Fiber 100 Mbps',
            type: 'fiber',
            speed: '100 Mbps',
            monthlyFee: 2500,
            setupFee: 15000,
            features: ['Unlimited Data', 'Free WiFi Router', 'Static IP Available'],
            availability: 'available'
          },
          {
            id: 'FIB-200',
            name: 'Fiber 200 Mbps',
            type: 'fiber',
            speed: '200 Mbps',
            monthlyFee: 3500,
            setupFee: 15000,
            features: ['Unlimited Data', 'Free WiFi Router', 'Static IP Available', 'Priority Support'],
            availability: 'available'
          }
        );
      }

      // ADSL packages
      if (infrastructure.adsl.available) {
        packages.push(
          {
            id: 'ADSL-16',
            name: 'ADSL 16 Mbps',
            type: 'adsl',
            speed: '16 Mbps',
            monthlyFee: 1500,
            setupFee: 5000,
            features: ['200 GB Data', 'Free Modem', 'Email Support'],
            availability: 'available'
          },
          {
            id: 'ADSL-UNL',
            name: 'ADSL Unlimited',
            type: 'adsl',
            speed: '8 Mbps',
            monthlyFee: 2000,
            setupFee: 5000,
            features: ['Unlimited Data', 'Free Modem', 'Phone Support'],
            availability: 'available'
          }
        );
      }

      // Mobile packages (always available)
      packages.push(
        {
          id: 'MOB-150',
          name: 'Mobile Broadband 150 GB',
          type: 'mobile',
          speed: 'Up to 150 Mbps',
          monthlyFee: 3000,
          setupFee: 2000,
          features: ['150 GB High Speed Data', 'Free Device', 'Nationwide Coverage'],
          availability: 'available'
        }
      );

      res.status(200).json(packages);
    } catch (error) {
      console.error('Error in getAvailablePackages:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  },

  // POST /api/slt/qualifications/{id}/feedback - Submit feedback
  submitFeedback: async (req, res) => {
    try {
      const { id } = req.params;
      const { rating, comment, actualInstallationTime, serviceQuality } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Rating must be between 1 and 5'
        });
      }

      const feedback = {
        rating,
        comment,
        actualInstallationTime,
        serviceQuality,
        submittedDate: new Date().toISOString(),
        '@type': 'QualificationFeedback'
      };

      const result = await sltQualificationsCollection.updateOne(
        { id },
        { 
          $set: { 
            feedback,
            lastUpdated: new Date().toISOString()
          }
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Qualification with id ${id} not found`
        });
      }

      res.status(200).json({
        message: 'Feedback submitted successfully',
        feedback
      });
    } catch (error) {
      console.error('Error in submitFeedback:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  },

  // PATCH /api/slt/qualifications/{id} - Update qualification
  updateQualification: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Prevent updating non-patchable attributes
      const nonPatchableFields = ['id', 'href', 'creationDate', '_id'];
      nonPatchableFields.forEach(field => {
        if (updates.hasOwnProperty(field)) {
          delete updates[field];
        }
      });

      updates.lastUpdated = new Date().toISOString();

      const result = await sltQualificationsCollection.updateOne(
        { id },
        { $set: updates }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: `SLT qualification with id ${id} not found`
        });
      }

      const updatedQualification = await sltQualificationsCollection.findOne({ id });
      const response = { ...updatedQualification };
      delete response._id;

      res.status(200).json(cleanForJsonResponse(response));
    } catch (error) {
      console.error('Error in updateQualification:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  },

  // DELETE /api/slt/qualifications/{id} - Delete qualification
  deleteQualification: async (req, res) => {
    try {
      const { id } = req.params;

      const result = await sltQualificationsCollection.deleteOne({ id });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: `SLT qualification with id ${id} not found`
        });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error in deleteQualification:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  },

  // POST /api/slt/checkBulk - Bulk location check for enterprise
  checkBulkLocations: async (req, res) => {
    try {
      const { locations } = req.body;

      if (!locations || !Array.isArray(locations) || locations.length === 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Locations array is required and must not be empty'
        });
      }

      if (locations.length > 100) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Maximum 100 locations allowed per bulk request'
        });
      }

      const results = [];
      
      for (const location of locations) {
        try {
          const infrastructure = await checkInfrastructureAvailability(location);
          
          const qualificationId = `SLT-BULK-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          
          const qualification = {
            _id: new ObjectId(),
            id: qualificationId,
            href: `/api/slt/qualifications/${qualificationId}`,
            state: 'done',
            creationDate: new Date().toISOString(),
            completionDate: new Date().toISOString(),
            location,
            infrastructure,
            requestedServices: ['Bulk Check'],
            qualificationResult: (infrastructure.fiber.available || infrastructure.adsl.available) ? 'qualified' : 'conditional',
            isBulkCheck: true,
            '@type': 'SLTLocationQualification'
          };

          // Save to MongoDB
          await sltQualificationsCollection.insertOne(qualification);
          
          // Add to results (exclude MongoDB _id)
          const result = { ...qualification };
          delete result._id;
          results.push(result);
          
        } catch (error) {
          console.error(`Error checking location ${location.address}:`, error);
          results.push({
            location,
            error: 'Failed to check location',
            '@type': 'SLTLocationQualificationError'
          });
        }
      }

      res.status(201).json({
        totalLocations: locations.length,
        successfulChecks: results.filter(r => !r.error).length,
        failedChecks: results.filter(r => r.error).length,
        results: results.map(r => cleanForJsonResponse(r))
      });
    } catch (error) {
      console.error('Error in checkBulkLocations:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
};

// Initialize sample data if collections are empty
const initializeSampleData = async () => {
  try {
    const qualCount = await sltQualificationsCollection.countDocuments();
    const infraCount = await infrastructureCollection.countDocuments();
    const coverageCount = await coverageDataCollection.countDocuments();

    if (qualCount === 0) {
      console.log('Initializing sample qualification data...');
      const sampleQualifications = [
        {
          id: 'SLT-QUAL-SAMPLE-001',
          href: '/api/slt/qualifications/SLT-QUAL-SAMPLE-001',
          state: 'done',
          creationDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          completionDate: new Date(Date.now() - 86400000 + 5000).toISOString(),
          location: {
            address: 'No. 45, Galle Road, Colombo 03',
            district: 'Colombo',
            province: 'Western',
            postalCode: '00300'
          },
          infrastructure: {
            fiber: { available: true, technology: 'FTTH', maxSpeed: '100 Mbps', coverage: 'full', monthlyFee: 2500 },
            adsl: { available: true, technology: 'ADSL2+', maxSpeed: '24 Mbps', lineQuality: 'excellent', monthlyFee: 1500 },
            mobile: { available: true, technologies: ['4G', '5G'], coverage: 'Excellent' }
          },
          requestedServices: ['Fiber Broadband'],
          qualificationResult: 'qualified',
          estimatedInstallationTime: '3-5 business days',
          '@type': 'SLTLocationQualification'
        }
      ];
      
      await sltQualificationsCollection.insertMany(sampleQualifications);
    }

    if (infraCount === 0) {
      console.log('Initializing sample infrastructure data...');
      const sampleInfrastructure = [
        {
          district: 'Colombo',
          fiber: { available: true, technology: 'FTTH', maxSpeed: '1 Gbps', monthlyFee: 2500 },
          adsl: { available: true, technology: 'ADSL2+', maxSpeed: '24 Mbps', monthlyFee: 1500 },
          fiberNetworks: [{ type: 'FTTH', coverage: 90, capacity: '100 Gbps', lastUpgrade: '2023-06-15' }],
          adslExchanges: [{ name: 'Colombo Main Exchange', location: 'Colombo', capacity: 50000, technology: 'ADSL2+', coverageRadius: 5000 }],
          mobileNetworks: [{ operator: 'SLT Mobitel', technologies: ['4G', '5G'], coverage: 95 }]
        },
        {
          district: 'Kandy',
          fiber: { available: true, technology: 'FTTH', maxSpeed: '100 Mbps', monthlyFee: 2500 },
          adsl: { available: true, technology: 'ADSL2+', maxSpeed: '16 Mbps', monthlyFee: 1500 },
          fiberNetworks: [{ type: 'FTTH', coverage: 60, capacity: '50 Gbps', lastUpgrade: '2023-03-20' }],
          adslExchanges: [{ name: 'Kandy Exchange', location: 'Kandy', capacity: 20000, technology: 'ADSL2+', coverageRadius: 4000 }],
          mobileNetworks: [{ operator: 'SLT Mobitel', technologies: ['4G'], coverage: 90 }]
        }
      ];
      
      await infrastructureCollection.insertMany(sampleInfrastructure);
    }

    if (coverageCount === 0) {
      console.log('Initializing sample coverage data...');
      const sampleCoverage = [
        { district: 'Colombo', technology: 'fiber', coverage: 85, technologyType: 'FTTH' },
        { district: 'Colombo', technology: 'adsl', coverage: 95, maxSpeed: '24 Mbps' },
        { district: 'Kandy', technology: 'fiber', coverage: 60, technologyType: 'FTTH' },
        { district: 'Kandy', technology: 'adsl', coverage: 90, maxSpeed: '16 Mbps' },
        { district: 'Galle', technology: 'fiber', coverage: 40, technologyType: 'FTTH' },
        { district: 'Galle', technology: 'adsl', coverage: 85, maxSpeed: '16 Mbps' }
      ];
      
      await coverageDataCollection.insertMany(sampleCoverage);
    }

    console.log('Sample data initialization complete');
  } catch (error) {
    console.error('Error initializing sample data:', error);
  }
};

// Initialize sample data after a delay to ensure connection is established
setTimeout(initializeSampleData, 2000);

module.exports = sltQualificationController;