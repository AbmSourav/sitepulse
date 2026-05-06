<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Website;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SiteController extends Controller
{
    public function disconnect(Request $request): JsonResponse
    {
        /** @var Website $website */
        $website = $request->attributes->get('website');

        $website->update(['status' => 'disabled']);

        return response()->json([
            'message'   => 'Site disconnected successfully',
        ], 200);
    }
}
