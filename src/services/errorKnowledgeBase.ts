import { ErrorExplanation } from '../types/api';

export const ERROR_EXPLANATIONS: Record<number, ErrorExplanation> = {
  400: {
    statusCode: 400,
    title: 'Bad Request',
    category: 'Client Error (4xx)',
    summary: 'The server could not understand or process the request due to malformed syntax or invalid input.',
    beginnerExplanation:
      'Think of this like handing a form to a clerk with missing required boxes or scrambled handwriting. The server received your request, checked it, and rejected it before running any business logic because something in the URL, query parameters, headers, or JSON body does not match what the API expects.',
    possibleCauses: [
      'Malformed JSON syntax in the request body (missing quotes, trailing commas, or unclosed braces).',
      'Missing a required field or sending the wrong data type (for example, text where a number is expected).',
      'Missing or mismatched Content-Type header (e.g., sending JSON without Content-Type: application/json).',
      'Invalid query parameter format or out-of-range pagination values.',
    ],
    practicalSolutions: [
      'Run the Smart Request Validator to verify your JSON body and Content-Type header.',
      'Check the API documentation for required field names, spelling, and data types.',
      'Use the "Format JSON" button in the Body tab to catch syntax errors immediately.',
      'Inspect the response body for field-level validation messages returned by the backend.',
    ],
    troubleshootingSteps: [
      'Verify the HTTP method matches the endpoint specification.',
      'Validate JSON syntax in the Request Body tab.',
      'Confirm Content-Type is set to application/json when sending JSON.',
      'Remove empty or malformed query parameters and retry.',
    ],
    exampleFix: 'Headers: { "Content-Type": "application/json" }\nBody: { "email": "dev@example.com", "role": "editor" }',
  },
  401: {
    statusCode: 401,
    title: 'Unauthorized',
    category: 'Client Error (4xx)',
    summary: 'Authentication is required or the provided credentials/token are invalid or expired.',
    beginnerExplanation:
      'The server does not know who you are yet, or your ID badge expired. Unlike 403 (Forbidden), 401 specifically means authentication failed or was missing from your request.',
    possibleCauses: [
      'No Authorization header, Bearer token, or API key was included in the request.',
      'Your JWT or OAuth access token has expired and needs to be refreshed.',
      'Typo in the token prefix (missing "Bearer " before the token) or wrong API key header name.',
      'An environment variable like {{authToken}} is empty or using the wrong environment (Local vs. Staging).',
    ],
    practicalSolutions: [
      'Open the Authorization tab and select Bearer Token, API Key, or Basic Auth.',
      'Check the active Environment in the top bar to ensure your token variable is populated.',
      'Re-authenticate with your login endpoint to obtain a fresh token.',
      'Verify whether the API expects the key in a header (X-API-Key) or query parameter.',
    ],
    troubleshootingSteps: [
      'Check Authorization tab configuration.',
      'Inspect resolved request headers to ensure Authorization is present.',
      'Verify token expiration and active environment variables.',
    ],
    exampleFix: 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  },
  403: {
    statusCode: 403,
    title: 'Forbidden',
    category: 'Client Error (4xx)',
    summary: 'The server understood your identity, but your account lacks permission to access this resource.',
    beginnerExplanation:
      'Your ID badge is valid and the server knows who you are, but the door you are trying to open requires higher clearance—like an admin role instead of a standard user.',
    possibleCauses: [
      'Your user role or API key scopes do not permit this action (e.g., DELETE on a read-only key).',
      'IP allowlist or CORS/origin restriction on the server blocked the client.',
      'Trying to access another user’s private resource ID.',
      'API Security Guard or server WAF policy blocked the request destination.',
    ],
    practicalSolutions: [
      'Verify your API key scopes or user role permissions in the target service.',
      'Confirm you are targeting resource IDs owned by the authenticated account.',
      'Check if an additional custom header (e.g., X-Tenant-ID) is required.',
    ],
    troubleshootingSteps: [
      'Confirm authentication succeeds (not a 401).',
      'Check user permissions / OAuth scopes for the endpoint.',
      'Verify resource ownership and account tier limits.',
    ],
  },
  404: {
    statusCode: 404,
    title: 'Not Found',
    category: 'Client Error (4xx)',
    summary: 'The requested endpoint path or resource ID does not exist on the server.',
    beginnerExplanation:
      'You reached the server successfully, but there is nothing at the specific address you asked for. Either the URL path has a typo, the API version prefix is wrong, or the item ID was deleted.',
    possibleCauses: [
      'Typo in the URL path, missing slash, or wrong API version (/v1/ vs /v2/).',
      'Unresolved environment variable leaving literal {{baseUrl}} in the path.',
      'Wrong HTTP method paired with a route (some frameworks return 404 instead of 405).',
      'The specific record ID in the URL path does not exist in the database.',
    ],
    practicalSolutions: [
      'Double-check the route spelling, singular/plural noun (/users vs /user), and trailing slashes.',
      'Ensure {{baseUrl}} in your active Environment does not add a duplicate path segment.',
      'Verify the resource ID exists by listing records with a GET request first.',
    ],
    troubleshootingSteps: [
      'Inspect the fully resolved URL preview below the URL bar.',
      'Verify the route path against your Express router definitions.',
      'Confirm the resource ID exists in your target environment.',
    ],
  },
  405: {
    statusCode: 405,
    title: 'Method Not Allowed',
    category: 'Client Error (4xx)',
    summary: 'The endpoint URL exists, but it does not accept the HTTP method you used.',
    beginnerExplanation:
      'You arrived at the right address, but knocked with the wrong action. For example, you sent a POST request to a URL that only accepts GET requests.',
    possibleCauses: [
      'Using GET instead of POST (or PUT instead of PATCH) for the endpoint.',
      'Sending a request to a collection root (/items) with DELETE when it expects /items/:id.',
    ],
    practicalSolutions: [
      'Check the response "Allow" header—it often lists the supported HTTP methods.',
      'Switch the HTTP method dropdown in the Request Builder to the supported verb.',
    ],
    troubleshootingSteps: [
      'Check the Allow header in the Response Headers tab.',
      'Switch HTTP method (GET / POST / PUT / PATCH / DELETE) as documented.',
    ],
  },
  408: {
    statusCode: 408,
    title: 'Request Timeout',
    category: 'Client Error (4xx)',
    summary: 'The server closed the connection because the request took too long to complete.',
    beginnerExplanation:
      'The server waited for your request to finish arriving, ran out of patience, and hung up. This also appears when a slow endpoint exceeds the client timeout threshold.',
    possibleCauses: [
      'Target server is overloaded or running an unindexed slow database query.',
      'Large payload upload exceeding the timeout window.',
      'Network congestion or firewall dropping idle packets.',
    ],
    practicalSolutions: [
      'Increase the Request Timeout setting in Settings (e.g., from 15000ms to 30000ms).',
      'Reduce payload size or paginate large list queries using query parameters.',
      'Retry the request once target server load stabilizes.',
    ],
    troubleshootingSteps: [
      'Check Settings > Request Timeout configuration.',
      'Test a lightweight health endpoint on the same host.',
      'Add pagination parameters like ?limit=20.',
    ],
  },
  409: {
    statusCode: 409,
    title: 'Conflict',
    category: 'Client Error (4xx)',
    summary: 'The request conflicts with the current state of the target resource.',
    beginnerExplanation:
      'You are trying to create or update something that clashes with existing data—for example, registering an email address that already exists.',
    possibleCauses: [
      'Duplicate unique key (email, username, slug) on a POST create call.',
      'Optimistic locking / version mismatch during a concurrent PUT/PATCH update.',
    ],
    practicalSolutions: [
      'Use a unique value in your test payload or switch to PUT/PATCH to update the existing record.',
      'Fetch the latest version of the resource before updating.',
    ],
    troubleshootingSteps: [
      'Inspect the response error message for the conflicting field name.',
      'Modify the unique field or fetch the current record state.',
    ],
  },
  422: {
    statusCode: 422,
    title: 'Unprocessable Entity',
    category: 'Client Error (4xx)',
    summary: 'The JSON syntax is valid, but semantic validation rules failed on the server.',
    beginnerExplanation:
      'Your envelope and handwriting were fine (unlike 400), so the server could read every field—but one or more values broke business rules, like a negative price or an invalid email format.',
    possibleCauses: [
      'Email format, password length, or date format failed schema validation.',
      'Referenced foreign key ID does not exist.',
    ],
    practicalSolutions: [
      'Inspect the response errors array to identify which field failed validation.',
      'Adjust field formats to match the API schema constraints.',
    ],
    troubleshootingSteps: [
      'Read field-level messages in the JSON response body.',
      'Update request body values and resend.',
    ],
  },
  429: {
    statusCode: 429,
    title: 'Too Many Requests',
    category: 'Client Error (4xx)',
    summary: 'You have exceeded the API rate limit within the allowed time window.',
    beginnerExplanation:
      'You sent requests faster than the server allows. APIs enforce rate limits to prevent overload or abuse, especially during automated Collection Runner loops.',
    possibleCauses: [
      'Running a large collection rapidly without delays.',
      'Exceeding free-tier or per-minute API key quotas.',
    ],
    practicalSolutions: [
      'Wait for the duration specified in the Retry-After response header before retrying.',
      'Check X-RateLimit-Remaining and X-RateLimit-Reset headers.',
      'Reduce batch size when using the Collection Runner.',
    ],
    troubleshootingSteps: [
      'Inspect Response Headers for Retry-After or X-RateLimit-Reset.',
      'Pause briefly before re-running the request.',
    ],
  },
  500: {
    statusCode: 500,
    title: 'Internal Server Error',
    category: 'Server Error (5xx)',
    summary: 'An unexpected error or unhandled exception occurred inside the backend server.',
    beginnerExplanation:
      'Something broke on the server side while handling your request. This usually indicates a bug in backend code, a crashed database query, or a missing server environment variable—not necessarily a syntax error on your side.',
    possibleCauses: [
      'Unhandled runtime exception (e.g., reading a property of undefined) in Express route handler.',
      'Database connection failure or SQL/ORM query error.',
      'Unexpected edge-case payload that bypassed backend validation.',
    ],
    practicalSolutions: [
      'Check your Express.js server terminal logs for the full stack trace.',
      'Verify all required payload fields are present so the backend does not crash on null values.',
      'Test the endpoint with a minimal valid JSON payload to isolate the trigger.',
    ],
    troubleshootingSteps: [
      'Inspect Express console/error logs.',
      'Verify database and environment config on the server.',
      'Retry with a minimal known-good request payload.',
    ],
  },
  502: {
    statusCode: 502,
    title: 'Bad Gateway',
    category: 'Server Error (5xx)',
    summary: 'An upstream server or reverse proxy received an invalid response from the target service.',
    beginnerExplanation:
      'Your request went through a gateway or proxy server (like Nginx, Cloud Run, or your Express proxy), which tried to talk to the downstream service—but got a broken or empty reply.',
    possibleCauses: [
      'The downstream Node/Express server crashed or restarted mid-request.',
      'Target upstream host returned a malformed HTTP response.',
      'DNS resolution or port mismatch between proxy and upstream service.',
    ],
    practicalSolutions: [
      'Confirm the upstream server process is running and listening on the expected port.',
      'Check reverse proxy / Express proxy logs for upstream connection errors.',
      'Wait a few seconds if the target service is cold-starting.',
    ],
    troubleshootingSteps: [
      'Ping the upstream service health endpoint directly.',
      'Verify target port and protocol (http vs https).',
    ],
  },
  503: {
    statusCode: 503,
    title: 'Service Unavailable',
    category: 'Server Error (5xx)',
    summary: 'The server is temporarily unable to handle the request due to maintenance or overload.',
    beginnerExplanation:
      'The server is alive enough to answer the phone, but says "We are closed for maintenance or completely swamped right now—please try again shortly."',
    possibleCauses: [
      'Scheduled server maintenance or deployment rollover in progress.',
      'Server CPU/memory exhaustion or database connection pool saturation.',
      'Dependent microservice is down.',
    ],
    practicalSolutions: [
      'Check the Retry-After response header if provided.',
      'Wait briefly and retry the request.',
      'Verify backend container/process health and database connectivity.',
    ],
    troubleshootingSteps: [
      'Check /health endpoint on the backend.',
      'Wait 15–30 seconds and retry.',
    ],
  },
  504: {
    statusCode: 504,
    title: 'Gateway Timeout',
    category: 'Server Error (5xx)',
    summary: 'The proxy or gateway timed out waiting for a response from the upstream API.',
    beginnerExplanation:
      'The gateway forwarded your request, waited for the target API to reply, and gave up when the upstream server stayed silent too long.',
    possibleCauses: [
      'Upstream API is hanging on a slow external call or heavy computation.',
      'Network firewall silently dropping packets to the upstream host.',
    ],
    practicalSolutions: [
      'Check upstream server performance and logs.',
      'Test a smaller query or shorter payload.',
    ],
    troubleshootingSteps: [
      'Check upstream latency and logs.',
      'Increase gateway timeout if testing long-running endpoints.',
    ],
  },
};

export function getLocalErrorExplanation(statusCode: number): ErrorExplanation {
  if (ERROR_EXPLANATIONS[statusCode]) {
    return ERROR_EXPLANATIONS[statusCode];
  }

  if (statusCode === 0) {
    return {
      statusCode: 0,
      title: 'Network / Connection Error',
      category: 'Network / Transport',
      summary: 'The request could not reach the server or was blocked by browser CORS policy.',
      beginnerExplanation:
        'Your request never received an HTTP status code back. This commonly happens when the Express backend is offline, the domain name does not resolve, or a browser CORS restriction blocked a direct cross-origin call.',
      possibleCauses: [
        'The Express.js backend server is not running on the configured VITE_API_BASE_URL.',
        'Wrong hostname, port, or offline internet connection.',
        'Direct browser requests to third-party APIs without CORS headers are blocked by the browser.',
      ],
      practicalSolutions: [
        'Start your Express.js backend server so requests can be proxied cleanly without browser CORS limits.',
        'Check Settings to verify the Backend API Base URL.',
        'Ensure your Express app uses cors() middleware allowing your frontend origin.',
      ],
      troubleshootingSteps: [
        'Run Backend Health Check in Settings.',
        'Check browser DevTools Network tab for CORS or ERR_CONNECTION_REFUSED.',
        'Confirm URL spelling and port number.',
      ],
    };
  }

  const isServer = statusCode >= 500;
  return {
    statusCode,
    title: isServer ? `Server Error (${statusCode})` : `Client Error (${statusCode})`,
    category: isServer ? 'Server Error (5xx)' : 'Client Error (4xx)',
    summary: isServer
      ? 'The server encountered an error while fulfilling this request.'
      : 'The request could not be completed as sent due to a client-side issue.',
    beginnerExplanation: isServer
      ? 'An HTTP 5xx code means the issue is on the server side. Inspect server logs and verify upstream services.'
      : 'An HTTP 4xx code means something in the request URL, method, headers, or payload needs adjustment.',
    possibleCauses: isServer
      ? ['Unhandled backend exception', 'Upstream dependency failure']
      : ['Invalid request parameters or payload', 'Missing or expired authentication'],
    practicalSolutions: isServer
      ? ['Inspect Express backend logs', 'Retry after verifying service health']
      : ['Review request URL, headers, and JSON body', 'Run Smart Request Validator'],
    troubleshootingSteps: [
      'Inspect the raw response body and headers.',
      'Verify request configuration in the API Client.',
    ],
  };
}
