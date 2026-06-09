<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Website;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SiteController extends Controller
{
    public function disconnect(Request $request): JsonResponse
    {
        /** @var Website $website */
        $website = $request->attributes->get('website');

        $website->update(['status' => 'disconnected']);

        return response()->json([
            'message' => 'Site disconnected successfully',
        ], 200);
    }

    public function reconnect(Request $request): JsonResponse
    {
        /** @var Website $website */
        $website = $request->attributes->get('website');

        if (! $website) {
            return response()->json([
                'message' => 'Site not found',
            ], 404);
        }

        $website->update(['status' => 'connected']);

        return response()->json([
            'message' => 'Site reconnected successfully',
        ], 200);
    }
}
