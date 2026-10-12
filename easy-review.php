<?php
/*
Plugin Name: Easy Review
Description: Easily review a page build with comments and markup.
Version: 0.1
Author: Luke Wagner
Author URI: https://lukeawagner.com
License: GPL2
*/

if (!defined('ABSPATH')) {
    exit;
}

function easy_review_scripts() {
    if (is_admin()) {
        return;
    }

    $object_id = get_queried_object_id();

    $options = get_option('easy_review_options');

    $department_colors = [
        'copy' => $options['copy_review_color'] ?? '#0000ff',
        'design' => $options['design_review_color'] ?? '#ff0000',
        'development' => $options['development_review_color'] ?? '#00ff00',
        'general' => $options['general_review_color'] ?? '#808080',
    ];

    if (is_singular()) {
        $storage_key = 'page_annotations_' . $object_id;
    } elseif (is_post_type_archive()) {
        $storage_key = 'archive_annotations_' . get_post_type();
    } elseif (is_category()) {
        $storage_key = 'category_annotations_' . $object_id;
    } elseif (is_tag()) {
        $storage_key = 'tag_annotations_' . $object_id;
    } else {
        $storage_key = 'global_annotations_' . md5($_SERVER['REQUEST_URI']);
    }
    $annotations = get_option($storage_key, []);

wp_enqueue_script(
    'easy-review-click-detection',
    plugins_url('/js/click-detection.js', __FILE__),
    [],
    filemtime(plugin_dir_path(__FILE__) . 'js/click-detection.js'),
    true
);

wp_enqueue_style(
    'review-style',
    plugins_url('/css/review.css', __FILE__),
    [],
    filemtime(plugin_dir_path(__FILE__) . 'css/review.css'),
    'all'
);

    wp_localize_script(
        'easy-review-click-detection',
        'easyReviewData',
        [
            'ajax_url' => admin_url('admin-ajax.php'),
            'storage_key' => $storage_key,
            'saved_annotations' => is_array($annotations) ? $annotations : [],
            'department_colors' => $department_colors,
            'enable_reviews' => !empty($options['enable_frontend_reviews']),
            'clock_svg' => plugins_url('/images/time-fast-svgrepo-com.svg', __FILE__),
            'close_svg' => plugins_url('/images/close-circle-svgrepo-com.svg', __FILE__),
            'minus_svg' => plugins_url('/images/minus-circle-svgrepo-com.svg', __FILE__),
            'edit_svg' => plugins_url('/images/edit-text-bar-1372-svgrepo-com.svg', __FILE__),
            'maximize_svg' => plugins_url('/images/maximize-copy-svgrepo-com.svg', __FILE__),
            'minimize_svg' => plugins_url('/images/minimize-svgrepo-com.svg', __FILE__),
            'trash_svg' => plugins_url('/images/trash-svgrepo-com.svg', __FILE__),
        ]
    );
}
add_action('wp_enqueue_scripts', 'easy_review_scripts');


add_action('wp_ajax_save_annotation', 'easy_review_save_annotation');

function easy_review_save_annotation() {
    $storage_key = isset($_POST['storage_key'])
        ? sanitize_text_field($_POST['storage_key'])
        : '';

    if (!$storage_key) {
        wp_send_json_error('Missing storage key');
    }

    $annotation = isset($_POST['annotation'])
        ? json_decode(stripslashes($_POST['annotation']), true)
        : null;

    if (!is_array($annotation)) {
        wp_send_json_error('Invalid annotation');
    }

    $annotation = [
        'id'   => isset($annotation['id']) ? sanitize_text_field($annotation['id']) : uniqid('er_', true),
        'text' => isset($annotation['text']) ? sanitize_text_field($annotation['text']) : '',
        'department' => isset($annotation['department']) ? sanitize_text_field($annotation['department']) : '',
        'selector' => isset($annotation['selector']) ? sanitize_text_field($annotation['selector']) : '',
        'fallbackSelector' => isset($annotation['fallbackSelector']) ? sanitize_text_field($annotation['fallbackSelector']) : '',
        'offsetX'    => isset($annotation['offsetX']) ? floatval($annotation['offsetX']) : 0,
        'offsetY'    => isset($annotation['offsetY']) ? floatval($annotation['offsetY']) : 0,
        'offsetXPercent' => isset($annotation['offsetXPercent']) ? floatval($annotation['offsetXPercent']) : 0,
        'offsetYPercent' => isset($annotation['offsetYPercent']) ? floatval($annotation['offsetYPercent']) : 0,
        'pageX' => isset($annotation['pageX']) ? intval($annotation['pageX']) : 0,
        'pageY' => isset($annotation['pageY']) ? intval($annotation['pageY']) : 0,
        'dateCreated' => isset($annotation['dateCreated']) ? sanitize_text_field($annotation['dateCreated']) : '',
        'resolution' => isset($annotation['resolution']) ? sanitize_text_field($annotation['resolution']) : '',
    ];

    $annotations = get_option($storage_key, []);

    if (!is_array($annotations)) {
        $annotations = [];
    }

    $annotations[] = $annotation;

    update_option($storage_key, $annotations);

    wp_send_json_success($annotation);
}

add_action('wp_ajax_delete_annotation', 'easy_review_delete_annotation');

function easy_review_delete_annotation() {

    $storage_key = isset($_POST['storage_key'])
        ? sanitize_text_field($_POST['storage_key'])
        : '';
    $annotation_id = sanitize_text_field($_POST['annotation_id']);

    $annotations = get_option($storage_key, []);

    if (!is_array($annotations)) {
        $annotations = [];
    }

    $annotations = array_filter($annotations, function($annotation) use ($annotation_id) {
        return $annotation['id'] !== $annotation_id;
    });

    update_option($storage_key, array_values($annotations));

    wp_send_json_success();
}

// Create plugin settings page
add_action('admin_menu', 'easy_review_add_settings_page');

function easy_review_add_settings_page() {
    add_options_page(
        'Easy Review Settings',
        'Easy Review',
        'manage_options',
        'easy-review-settings',
        'easy_review_render_settings_page'
    );
}

function easy_review_render_settings_page() {
    ?>
    <div class="wrap">
        <h1>Easy Review Settings</h1>

        <form method="post" action="options.php">
            <?php
                settings_fields('easy_review_settings_group');
                do_settings_sections('easy-review-settings');
                submit_button();
            ?>
        </form>
    </div>
    <?php
}

add_action('admin_init', 'easy_review_register_settings');

function easy_review_register_settings() {
    register_setting(
        'easy_review_settings_group',
        'easy_review_options'
    );

    add_settings_section(
        'easy_review_main_section',
        'General Settings',
        null,
        'easy-review-settings'
    );

    add_settings_field(
        'enable_frontend_reviews',
        'Enable Frontend Reviews',
        'easy_review_enable_frontend_reviews_field',
        'easy-review-settings',
        'easy_review_main_section'
    );

    add_settings_field(
        'copy_review_color',
        'Copy Review Color',
        'easy_review_copy_color_field',
        'easy-review-settings',
        'easy_review_main_section'
    );

    add_settings_field(
        'design_review_color',
        'Design Review Color',
        'easy_review_design_color_field',
        'easy-review-settings',
        'easy_review_main_section'
    );

    add_settings_field(
        'development_review_color',
        'Development Review Color',
        'easy_review_development_color_field',
        'easy-review-settings',
        'easy_review_main_section'
    );

    add_settings_field(
        'general_review_color',
        'General Review Color',
        'easy_review_general_color_field',
        'easy-review-settings',
        'easy_review_main_section'
    );
}

function easy_review_enable_frontend_reviews_field() {
    $options = get_option('easy_review_options');
    $checked = isset($options['enable_frontend_reviews']) ? $options['enable_frontend_reviews'] : '';

    ?>
    <label>
        <input
            type="checkbox"
            name="easy_review_options[enable_frontend_reviews]"
            value="1"
            <?php checked($checked, '1'); ?>
        >
        Enable Easy Review on the frontend
    </label>
    <?php
}

function easy_review_copy_color_field() {
    $options = get_option('easy_review_options');
    $color = isset($options['copy_review_color']) ? $options['copy_review_color'] : '#0000ff';
    ?>
    <input
        type="color"
        name="easy_review_options[copy_review_color]"
        value="<?php echo esc_attr($color); ?>"
    >
    <?php
}

function easy_review_design_color_field() {
    $options = get_option('easy_review_options');
    $color = isset($options['design_review_color']) ? $options['design_review_color'] : '#ff0000';
    ?>
    <input
        type="color"
        name="easy_review_options[design_review_color]"
        value="<?php echo esc_attr($color); ?>"
    >
    <?php
}

function easy_review_development_color_field() {
    $options = get_option('easy_review_options');
    $color = isset($options['development_review_color']) ? $options['development_review_color'] : '#00ff00';
    ?>
    <input
        type="color"
        name="easy_review_options[development_review_color]"
        value="<?php echo esc_attr($color); ?>"
    >
    <?php
}
function easy_review_general_color_field() {
    $options = get_option('easy_review_options');
    $color = isset($options['general_review_color']) ? $options['general_review_color'] : '#808080';
    ?>
    <input
        type="color"
        name="easy_review_options[general_review_color]"
        value="<?php echo esc_attr($color); ?>"
    >
    <?php
}

// Create indicator
// add_action( 'wp_footer', 'review_anchor_link' );

// function review_anchor_link() {
//     echo '<div id="review_anchor_link" class="er_review_indicator">EZ Review On</div>';
// }

// Create annotation list
// wp_body_open isn't called by every theme, so fall back to wp_footer
add_action( 'wp_body_open', 'annotation_list' );
add_action( 'wp_footer', 'annotation_list' );

function annotation_list() {
    static $rendered = false;
    if ( $rendered ) {
        return;
    }
    $rendered = true;

    echo '<div class="er_annotation_list">';
    echo '<div class="er_annotation_list_toggle list-closed" style="background-image: url(' . plugins_url('/images/annotate-svgrepo-com.svg', __FILE__) . ');"></div>';
    echo '<h2>Annotation List</h2>';
    echo '<div class="er_annotation_list_items">';
    echo '</div>';
    echo '</div>';
}

// Create admin bar toggle button
add_action('admin_bar_menu', 'ez_review_admin_toggle', 999);

function ez_review_admin_toggle($wp_admin_bar) {

    $wp_admin_bar->add_node([
        'id'    => 'ez_review_admin_toggle',
        'title' => 'Easy Review',
        'href'  => "#",
        'meta'  => [
            'title' => __('Start/Stop Easy Review'),
            'class' => 'ez_review_admin_btn'
        ]
    ]);

    $wp_admin_bar->add_node([
        'id'     => 'ez_review_copy',
        'parent' => 'ez_review_admin_toggle',
        'title'  => 'Copy Review',
        'href'   => '#',
        'meta'   => [
            'class' => 'ez-review-department-option'
        ]
    ]);

    $wp_admin_bar->add_node([
        'id'     => 'ez_review_design',
        'parent' => 'ez_review_admin_toggle',
        'title'  => 'Design Review',
        'href'   => '#',
        'meta'   => [
            'class' => 'ez-review-department-option'
        ]
    ]);

    $wp_admin_bar->add_node([
        'id'     => 'ez_review_development',
        'parent' => 'ez_review_admin_toggle',
        'title'  => 'Development Review',
        'href'   => '#',
        'meta'   => [
            'class' => 'ez-review-department-option'
        ]
    ]);

    $wp_admin_bar->add_node([
        'id'     => 'ez_review_settings',
        'parent' => 'ez_review_admin_toggle',
        'title'  => 'Settings',
        'href'   => admin_url('options-general.php?page=easy-review-settings'),
        'meta'   => [
            'class' => 'ez-review-settings-option'
        ]
    ]);
}