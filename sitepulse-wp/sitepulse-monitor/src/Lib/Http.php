<?php

namespace Sitepulse\SitepulseMonitor\Lib;

if (! defined('ABSPATH')) exit;

class Http
{
    /**
     * Base URL.
     *
     * @var string
     */
    private static $base_url = SPM_APP_URL;
    private static $namespace = '/api';
    private static $version = '/v1';

    /**
     * Create API URL with Base URL, Namespace, Version and Route
     *
     * @param string $route
     * @return string
     */
    private static function get_url($route, $get_params = [])
    {
        $url = static::$base_url . static::$namespace . static::$version . $route;

        if ($get_params) {
            return $url . '?' . http_build_query($get_params);
        }

        return $url;
    }

    /**
     * Get the default arguments for wp_remote_... requests.
     *
     * @return array
     */
    private static function getDefaultArguments()
    {
        return [
            'timeout' => 30,
        ];
    }

    private static function request(string $method, string $route, array $args, array $get_params = [])
    {
        $default = static::getDefaultArguments();
        $args = is_array($args) ? $args : [];
        $arguments = array_merge($default, $args, ['method' => strtoupper($method)]);
        $url = static::get_url($route, $get_params);

        if (\SPM_DEV_MODE === true) {
            return \wp_remote_request($url, $arguments);
        }
        return \wp_safe_remote_request($url, $arguments);
    }

    /**
     * POST request
     *
     * @param (string) $route
     * @param (array)  $args
     * @param (array)  $get_params
     * @return Response
     */
    public static function post($route, $args = [], $get_params = [])
    {
        $res = static::request('POST', $route, $args, $get_params);

        return new Response($res);
    }

    /**
     * GET request
     *
     * @param (string) $route
     * @param (array)  $args
     * @return Response
     */
    public static function get($route, $args = [], $get_params = [])
    {
        $res = static::request('GET', $route, $args, $get_params);

        return new Response($res);
    }

    /**
     * PUT request
     *
     * @param (string) $route
     * @param (array)  $args
     * @param (array)  $get_params
     * @return Response
     */
    public static function put($route, $args = [], $get_params = [])
    {
        $res = static::request('PUT', $route, $args, $get_params);

        return new Response($res);
    }

    /**
     * DELETE request
     *
     * @param (string) $route
     * @param (array)  $args
     * @return Response
     */
    public static function delete($route, $args = [], $get_params = [])
    {
        $res = static::request('DELETE', $route, $args, $get_params);

        return new Response($res);
    }
}
