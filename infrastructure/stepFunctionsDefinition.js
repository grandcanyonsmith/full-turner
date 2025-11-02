/**
 * Step Functions State Machine Definition
 * Orchestrates the workflow execution
 */

export const stateMachineDefinition = {
  Comment: "Full Turner Workflow - Template Processing with Image Generation",
  StartAt: "InitializeRun",
  States: {
    InitializeRun: {
      Type: "Task",
      Resource: "${InitializeRunFunctionArn}",
      Next: "LoadTemplate",
      Catch: [
        {
          ErrorEquals: ["States.ALL"],
          ResultPath: "$.error",
          Next: "HandleFailure"
        }
      ]
    },
    LoadTemplate: {
      Type: "Task",
      Resource: "${LoadTemplateFunctionArn}",
      Next: "ProcessImagesBatch",
      Catch: [
        {
          ErrorEquals: ["States.ALL"],
          ResultPath: "$.error",
          Next: "HandleFailure"
        }
      ],
      Retry: [
        {
          ErrorEquals: ["States.TaskFailed"],
          IntervalSeconds: 2,
          MaxAttempts: 3,
          BackoffRate: 2
        }
      ]
    },
    ProcessImagesBatch: {
      Type: "Task",
      Resource: "${ProcessImagesBatchFunctionArn}",
      Next: "ProcessImagesMap",
      Catch: [
        {
          ErrorEquals: ["States.ALL"],
          ResultPath: "$.error",
          Next: "HandleFailure"
        }
      ]
    },
    ProcessImagesMap: {
      Type: "Map",
      ItemsPath: "$.images",
      MaxConcurrency: 3,
      Iterator: {
        StartAt: "ProcessImage",
        States: {
          ProcessImage: {
            Type: "Task",
            Resource: "${ProcessImageFunctionArn}",
            End: true,
            Retry: [
              {
                ErrorEquals: ["States.TaskFailed"],
                IntervalSeconds: 2,
                MaxAttempts: 3,
                BackoffRate: 2
              }
            ],
            Catch: [
              {
                ErrorEquals: ["States.ALL"],
                ResultPath: "$.error",
                Next: "HandleImageFailure"
              }
            ]
          },
          HandleImageFailure: {
            Type: "Pass",
            Result: {
              "success": false,
              "error": "Image processing failed"
            },
            ResultPath: "$",
            End: true
          }
        }
      },
      ResultPath: "$.imageResults",
      Next: "AggregateImageResults"
    },
    AggregateImageResults: {
      Type: "Task",
      Resource: "${AggregateImageResultsFunctionArn}",
      Next: "ExecuteAgent",
      Catch: [
        {
          ErrorEquals: ["States.ALL"],
          ResultPath: "$.error",
          Next: "HandleFailure"
        }
      ]
    },
    ExecuteAgent: {
      Type: "Task",
      Resource: "${ExecuteAgentFunctionArn}",
      Next: "SaveOutput",
      Catch: [
        {
          ErrorEquals: ["States.ALL"],
          ResultPath: "$.error",
          Next: "HandleFailure"
        }
      ],
      Retry: [
        {
          ErrorEquals: ["States.TaskFailed"],
          IntervalSeconds: 5,
          MaxAttempts: 2,
          BackoffRate: 2
        }
      ]
    },
    SaveOutput: {
      Type: "Task",
      Resource: "${SaveOutputFunctionArn}",
      End: true,
      Catch: [
        {
          ErrorEquals: ["States.ALL"],
          ResultPath: "$.error",
          Next: "HandleFailure"
        }
      ]
    },
    HandleFailure: {
      Type: "Task",
      Resource: "${HandleFailureFunctionArn}",
      End: true,
      Catch: [
        {
          ErrorEquals: ["States.ALL"],
          ResultPath: "$.error",
          End: true
        }
      ]
    }
  }
};

/**
 * Generate Step Functions definition with function ARNs
 * @param {Object} functionArns - Object mapping function names to ARNs
 * @returns {Object} - Step Functions definition with ARNs substituted
 */
export function generateStateMachine(functionArns) {
  const definition = JSON.parse(JSON.stringify(stateMachineDefinition));
  
  // Replace placeholders with actual ARNs
  const replacements = {
    '${InitializeRunFunctionArn}': functionArns.InitializeRun,
    '${LoadTemplateFunctionArn}': functionArns.LoadTemplate,
    '${ProcessImagesBatchFunctionArn}': functionArns.ProcessImagesBatch,
    '${ProcessImageFunctionArn}': functionArns.ProcessImage,
    '${AggregateImageResultsFunctionArn}': functionArns.AggregateImageResults,
    '${ExecuteAgentFunctionArn}': functionArns.ExecuteAgent,
    '${SaveOutputFunctionArn}': functionArns.SaveOutput,
    '${HandleFailureFunctionArn}': functionArns.HandleFailure
  };

  function replacePlaceholders(obj) {
    if (typeof obj === 'string') {
      let result = obj;
      for (const [placeholder, value] of Object.entries(replacements)) {
        result = result.replace(placeholder, value);
      }
      return result;
    } else if (Array.isArray(obj)) {
      return obj.map(replacePlaceholders);
    } else if (obj !== null && typeof obj === 'object') {
      const newObj = {};
      for (const [key, value] of Object.entries(obj)) {
        newObj[key] = replacePlaceholders(value);
      }
      return newObj;
    }
    return obj;
  }

  return replacePlaceholders(definition);
}

