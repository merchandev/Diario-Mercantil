<?php
return [
  ['GET','/api/health','HealthController@ping'],
  ['POST','/api/auth/login','AuthController@login'],
  ['GET','/api/auth/me','AuthController@me', ['auth'=>true]],
  ['GET','/api/legal','LegalController@list', ['auth'=>true]],
  ['POST','/api/legal','LegalController@create', ['auth'=>true]],
  ['GET','/api/legal/{id}','LegalController@get', ['auth'=>true]],
  ['POST','/api/legal/{id}/reject','LegalController@reject', ['auth'=>true]],
  ['POST','/api/legal/{id}/payment','LegalController@addPayment', ['auth'=>true]],
  ['DELETE','/api/legal/{id}/payment/{pid}','LegalController@deletePayment', ['auth'=>true]],
  ['POST','/api/legal/upload-pdf','LegalController@uploadPdf', ['auth'=>true]],
];
