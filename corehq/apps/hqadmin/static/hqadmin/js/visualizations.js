var HQVisualizations = function (options) {
    var self = this;
    self.chart_name = options.chart_name;
    self.xaxis_label = options.xaxis_label;
    self.histogram_type = options.histogram_type;
    self.ajax_url = options.ajax_url;
    self.data = options.data || {};
    self.should_update_url = options.should_update_url === undefined ? true : options.should_update_url;
    self.interval = options.interval || "day";

    self.charts = { "bar-chart": null, "cumulative-chart": null, "stacked-cumulative-chart": null };
    self.charts_id = '#' + self.chart_name + '-charts';
    self.chart_tabs_id = '#' + self.chart_name + '-chart-tabs';

    function update_active_chart() {
        // for some reason nvd3 doesn't fully animate the charts, force this update after the chart is loaded
        var active_chart_name = $(self.chart_tabs_id + ' li.active a').attr('href').substr(1); // remove '#'
        _update_chart_if_exists(charts[active_chart_name]);
    }

    function _update_chart_if_exists(chart) {
        if (chart) {
            chart.update();
        }
    }

    self.init = function() {
        $(function() {
            // load new chart when daterange is clicked
            $(self.chart_tabs_id).on('submit', '.reload-graph-form', function() {
                var $this = $(this);
                var startdate = $this.find('[name="startdate"]').val();
                var enddate = $this.find('[name="enddate"]').val();
                self.loadChartData(update_active_chart, startdate, enddate);

                if (self.should_update_url) {
                    var new_url = "?startdate=" + startdate + "&enddate=" + enddate + window.location.hash;
                    History.pushState(null, "Reloaded Chart", new_url);

                    // keep the urls for the other data visualizations consistent with this datespan
                    $(".viz-url").each(function() {
                        var new_href = $(this).attr('href').split("?")[0] + new_url;
                        $(this).attr('href', new_href);
                    });
                }

                return false;
            });
            $(self.chart_tabs_id + ' .reload-graph-form').submit();

            // load chart if not already visible on the screen
            $(self.chart_tabs_id).on('click', 'a[data-toggle="hash-tab"]', function(){
                $('.nvd3-chart').hide();
                var $chart = $($(this).attr('href')).children('.nvd3-chart');
                $chart.show();
                var chart = charts[$chart.parents('.tab-pane').attr('id')];
                    _update_chart_if_exists(chart); // for some reason nvd3 doesn't fully animate the charts, force this update
            });
        });
    };

    self.loadChartData = function(callback_fn, startdate, enddate) {
        var $loading = $(self.charts_id + ' .loading');
        var $charts = $(self.charts_id + ' .nvd3-chart');

        $loading.show();
        var svg_width = $(self.charts_id + " .tab-pane.active").width();
        $charts.each(function(){
            // hack: need to explicitly set the width to a pixel value because nvd3 has issues when it's set to 100%
            var $svg_ele = $("<svg style='height:320px;'> </svg>").width(svg_width);
            $(this).hide().html('').append($svg_ele); // create a new svg element to stop update issues
        });

        self.data["histogram_type"] = self.histogram_type;
        if (enddate) {
            self.data["enddate"] = enddate;
        }
        if (startdate) {
            self.data["startdate"] = startdate;
        }

        $.getJSON(self.ajax_url, self.data,
            function(d) {
                var startdate = new Date(Date.UTC(d.startdate[0], d.startdate[1]-1, d.startdate[2]));
                var enddate = new Date(Date.UTC(d.enddate[0], d.enddate[1]-1, d.enddate[2]));
                charts = loadCharts(self.chart_name, self.xaxis_label, d.histo_data, d.initial_values,
                        startdate.getTime(), enddate.getTime(), self.interval);
                $loading.hide();
                $charts.show();

                // set the date fields if they're not already set
                $startdate_field = $("#" + self.chart_name + "-startdate");
                $enddate_field = $("#" + self.chart_name + "-enddate");
                if (!$startdate_field.val()) {
                    $startdate_field.val(startdate.toISOString().substr(0, 10)); // substr bc date strs are 10 chars
                }
                if (!$enddate_field.val()) {
                    $enddate_field.val(enddate.toISOString().substr(0, 10))
                }

                if (callback_fn) {
                    callback_fn();
                }
            }
        )
    };
};
