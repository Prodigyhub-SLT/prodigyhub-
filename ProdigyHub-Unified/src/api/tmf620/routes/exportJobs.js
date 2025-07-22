// src/routes/exportJobs.js - NEW FILE
const express = require('express');
const router = express.Router();

let exportJobs = [];
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

const createExportJobResponse = (data) => {
  const id = data.id || (idCounter++).toString();
  
  return {
    id,
    href: `/productCatalogManagement/v5/exportJob/${id}`,
    contentType: data.contentType || 'application/json',
    creationDate: new Date().toISOString(),
    completionDate: data.completionDate || null,
    path: data.path || '',
    query: data.query || '',
    status: data.status || 'Running',
    url: data.url || '',
    errorLog: data.errorLog || '',
    '@type': 'ExportJob'
  };
};

// GET all export jobs
router.get('/', (req, res, next) => {
  try {
    const { fields, ...filters } = req.query;
    let results = exportJobs;
    
    if (Object.keys(filters).length > 0) {
      results = exportJobs.filter(job => {
        return Object.entries(filters).every(([key, value]) => {
          return job[key] === value;
        });
      });
    }
    
    if (fields) {
      results = results.map(job => applyFieldSelection(job, fields));
    }
    
    res.status(200).json(results);
  } catch (error) {
    next(error);
  }
});

// GET single export job
router.get('/:id', (req, res, next) => {
  try {
    const { fields } = req.query;
    let job = exportJobs.find(j => j.id === req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Export job not found'
      });
    }

    if (fields) {
      job = applyFieldSelection(job, fields);
    }

    res.status(200).json(job);
  } catch (error) {
    next(error);
  }
});

// POST new export job
router.post('/', (req, res, next) => {
  try {
    const job = createExportJobResponse(req.body);
    exportJobs.push(job);
    
    // Simulate job completion after a short delay (for demo purposes)
    setTimeout(() => {
      const index = exportJobs.findIndex(j => j.id === job.id);
      if (index !== -1) {
        exportJobs[index].status = 'Succeeded';
        exportJobs[index].completionDate = new Date().toISOString();
      }
    }, 3000);
    
    res.status(201).json(job);
  } catch (error) {
    next(error);
  }
});

// DELETE export job
router.delete('/:id', (req, res, next) => {
  try {
    const index = exportJobs.findIndex(j => j.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Export job not found'
      });
    }

    exportJobs.splice(index, 1);
    res.status(204).json();
  } catch (error) {
    next(error);
  }
});

module.exports = router;