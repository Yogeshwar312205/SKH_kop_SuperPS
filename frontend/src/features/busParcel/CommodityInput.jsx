import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, Package } from 'lucide-react';
import { classifyCommodity, getPackagingTypes } from '../../services/apiV2';

/**
 * CommodityInput Component
 * 
 * Real-time commodity classification with:
 * - Hazard detection and warnings
 * - Bus eligibility badge
 * - Packaging recommendations
 * - Live validation feedback
 */
export const CommodityInput = ({ 
  value, 
  onChange, 
  packaging, 
  weight, 
  pieceCount,
  onValidationChange 
}) => {
  const [classification, setClassification] = useState(null);
  const [validation, setValidation] = useState(null);
  const [packagingTypes, setPackagingTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load packaging types on mount
  useEffect(() => {
    const loadPackagingTypes = async () => {
      try {
        const data = await getPackagingTypes();
        if (data.success && data.packagingTypes) {
          setPackagingTypes(data.packagingTypes);
        }
      } catch (err) {
        console.error('Failed to load packaging types:', err);
      }
    };
    loadPackagingTypes();
  }, []);

  // Classify commodity when inputs change
  useEffect(() => {
    const classifyDebounced = setTimeout(async () => {
      if (!value || value.trim().length < 3) {
        setClassification(null);
        setValidation(null);
        if (onValidationChange) {
          onValidationChange(null);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await classifyCommodity(
          value,
          packaging,
          weight || 0,
          pieceCount || 1
        );

        if (data.success) {
          setClassification(data.classification);
          setValidation(data.validation);
          
          if (onValidationChange) {
            onValidationChange(data.validation);
          }
        }
      } catch (err) {
        console.error('Classification error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(classifyDebounced);
  }, [value, packaging, weight, pieceCount, onValidationChange]);

  const getCategoryColor = (category) => {
    switch (category) {
      case 'HAZARDOUS':
        return 'text-red-700 bg-red-100 border-red-300';
      case 'AGRICULTURAL':
        return 'text-green-700 bg-green-100 border-green-300';
      case 'FRAGILE':
        return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      case 'GENERAL':
        return 'text-blue-700 bg-blue-100 border-blue-300';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-300';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-3">
      {/* Commodity Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <Package className="inline h-4 w-4 mr-1" />
          Commodity *
        </label>
        <div className="relative">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required
            placeholder="e.g., Soybean Seeds, Onion, Wheat, Milk"
            className="w-full border border-gray-300 rounded px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {loading && (
            <div className="absolute right-3 top-3">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Enter the name of the item you want to transport
        </p>
      </div>

      {/* Classification Result */}
      {classification && !loading && (
        <div className={`border rounded-lg p-3 ${getCategoryColor(classification.category)}`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">
                {classification.category}
              </span>
              {classification.subcategory && (
                <span className="text-xs opacity-75">
                  • {classification.subcategory.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            <span className={`text-xs font-medium ${getConfidenceColor(classification.confidence)}`}>
              {Math.round(classification.confidence * 100)}% confidence
            </span>
          </div>

          {/* Bus Eligibility Badge */}
          <div className="flex items-center gap-2 mb-2">
            {classification.busEligible ? (
              <div className="flex items-center gap-1 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-700">Bus Eligible</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-sm">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="font-medium text-red-700">Not Bus Eligible</span>
              </div>
            )}
            {classification.cargoClass && (
              <span className="text-xs px-2 py-0.5 rounded border border-current opacity-75">
                Class {classification.cargoClass}
              </span>
            )}
          </div>

          <p className="text-sm opacity-90">{classification.reason}</p>

          {classification.warning && (
            <div className="mt-2 flex items-start gap-2 text-xs opacity-80">
              <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
              <span>{classification.warning}</span>
            </div>
          )}
        </div>
      )}

      {/* Validation Errors */}
      {validation && !validation.isValid && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900 mb-1">Cannot transport on bus</h4>
              {validation.errors.map((err, i) => (
                <div key={i} className="mb-2">
                  <p className="text-sm text-red-800">{err.message}</p>
                  {err.recommendation && (
                    <p className="text-xs text-red-700 mt-1">
                      <strong>Recommendation:</strong> {err.recommendation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Validation Warnings */}
      {validation && validation.isValid && validation.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-yellow-900 mb-1">Warnings</h4>
              {validation.warnings.map((warn, i) => (
                <div key={i} className="mb-2">
                  <p className="text-sm text-yellow-800">{warn.message}</p>
                  {warn.recommendation && (
                    <p className="text-xs text-yellow-700 mt-1">
                      <strong>Recommendation:</strong> {warn.recommendation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Packaging Recommendation */}
      {validation && validation.packagingRecommendation && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Packaging Guidance</h4>
          <div className="space-y-2 text-sm text-blue-800">
            <div>
              <span className="font-medium">Recommended:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {validation.packagingRecommendation.recommended.map((pkg, i) => (
                  <span key={i} className="px-2 py-0.5 bg-blue-100 border border-blue-300 rounded text-xs">
                    {pkg.replace(/-/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
            {validation.packagingRecommendation.avoid && validation.packagingRecommendation.avoid.length > 0 && (
              <div>
                <span className="font-medium">Avoid:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {validation.packagingRecommendation.avoid.map((pkg, i) => (
                    <span key={i} className="px-2 py-0.5 bg-red-100 border border-red-300 rounded text-xs">
                      {pkg.replace(/-/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs opacity-90 mt-2">
              {validation.packagingRecommendation.reason}
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
          <strong>Classification Error:</strong> {error}
        </div>
      )}
    </div>
  );
};

export default CommodityInput;
