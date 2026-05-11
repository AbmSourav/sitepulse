<?php

namespace App\Http\Controllers\Api;

use App\Actions\StoreAuditReport;
use App\Http\Controllers\Controller;
use App\Models\Website;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    public function store(Request $request, StoreAuditReport $action): JsonResponse
    {
        /** @var Website $website */
        $website = $request->attributes->get('website');

        $report = $action->handle($website, $request->all());

        return response()->json([
            'message'   => 'Audit stored',
            'report_id' => $report->id,
        ], 201);
    }
}
