<?php

/**
 * @package SitePulseMonitor
 * @version 1.0.0
 *
 * Plugin Name: SitePulse Monitor
 * Plugin URI: https://sitepulsee.com
 * Description: A plugin to monitor the health of your WordPress site and send audit report to website owners.
 * Author: Keramot UL Islam
 * Version: 1.0.0
 * Author URI: https://sitepulsee.com
 * Text Domain: sitepulse-monitor
 */

use Sitepulse\SitepulseMonitor\Core;

if (! defined('ABSPATH')) exit;

define('SPM_VERSION', '1.0.0');
define('SPM_APP_URL', 'http://sitepulse-app.test:6080');
define('SPM_DEV_MODE', true);
define('SPM_DIR', plugin_dir_path(__FILE__));
define('SPM_URL', plugins_url('/', __FILE__));

require __DIR__ . '/vendor/autoload.php';

new Core();
