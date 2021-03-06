define(["../draggable/avalon.draggable", "text!./avalon.slider.html", "css!../chameleon/oniui-common.css", "css!./avalon.slider.css", "../avalon.getModel"], function(avalon, sourceHTML) {
    /**
     * @global Handlers ： 保存页面上所有滑动手柄
     * @global Index :点中手柄在Handlers中的索引，或滑动手柄在handlers中的索引 
     * @gloabal focusElement: 页面上点中的手柄元素的引用，当按下方向键时，滑动作用域此元素
     **/
    var Handlers = [], Index = 0, FocusElement, template = sourceHTML;
    var widget = avalon.ui["slider"] = function(element, data, vmodels) {

        var $element = avalon(element)
        var options = data.sliderOptions

        var isHorizontal = options.orientation === "horizontal"
        //将整个slider划分为N等分, 比如100, 227
        var valueMin = options.min 
        var valueMax = options.max  
        var oRange = options.range //true min max， 默认为false
        var values = options.values
        var twohandlebars = oRange === true
        var value = Number(options.value) //第几等份
        if (isNaN(value)) {
            var valVM = avalon.getModel(options.value, vmodels);
            if (valVM) {
                value = valVM[1][valVM[0]];
            }
        }
        options.template = options.getTemplate(template, options);
        // 固定最小的一边
        if (oRange === "min" && values) {
            value = values[0]
        } else if (oRange === "max" && values) { // 固定最大的一边
            value = values[1]
        }
        // 如果没有配置value和values,且range是min或者max，重置value
        if (!value && oRange === "min" && !values) {
            value =  valueMin || value;
        } else if (!value && oRange === 'max' && !values) {
            value = valueMax || value;
        }
        if (options.step !== 1 && !/\D/.test(options.step)) {
            value = correctValue(value);
        }
        // 如果滑动块有双手柄，重置values
        if (twohandlebars) {
            if (Array.isArray(values)) {
                values = values.length === 1 ? [values[0], values[0]] : values.concat()
            } else {
                values = [valueMin, valueMax]
            }
        }
        // 修正模板
        var sliderHTML = options.template.replace(/MS_OPTION_WIDTHORHEIGHT/g, isHorizontal? "width": "height").replace(/MS_OPTION_LEFTORBOTTOM/g, isHorizontal? "left" : "bottom");
        // handlers保存滑动块上的手柄，域Handlers进行区分
        var slider = avalon.parseHTML(sliderHTML).firstChild, handlers = []
        element.parentNode.insertBefore(slider, element.nextSibling)
        $element.addClass("ui-helper-hidden-accessible")

        function value2Percent(val) { // 将value值转换为百分比
            if (val < valueMin) {
                val = valueMin
            }
            if (val > valueMax) {
                val = valueMax
            }
            return parseFloat(((val-valueMin) / (valueMax-valueMin) * 100).toFixed(5))
        }
        function percent2Value(percent) {//0~1
            var val = (valueMax-valueMin) * percent +valueMin
            val = correctValue(val);
            return parseFloat(val.toFixed(3))
        }
        function correctValue(val) {
            var step = (options.step > 0) ? options.step : 1
            var valModStep = (val-valueMin) % step
            var n = (val-valueMin) / step 
            val = valueMin + (valModStep * 2 >= step ? step * Math.ceil(n) : step * Math.floor(n))
            return val;
        }
        var vmodel = avalon.define(data.sliderId, function(vm) {
            avalon.mix(vm, options);
            vm.$skipArray = ["template", "widgetElement", "step", "_dragEnd"]
            vm.widgetElement = element
            vm.step = (options.step > 0) ? options.step : 1
            vm.disabled = element.disabled
            vm.percent = twohandlebars ? value2Percent(values[1] - values[0] + valueMin) : value2Percent(value)
            vm.percent0 = twohandlebars ? value2Percent(values[0]) : 0
            vm.percent1 = twohandlebars ? value2Percent(values[1]) : 0
            vm.value = twohandlebars ? values.join() : value
            vm.values = values
            vm.$axis = isHorizontal ? "x" : "y"
            vm.$valueMin = valueMin
            vm.$valueMax = valueMax
            vm.$twohandlebars = twohandlebars
            vm.$percent2Value = percent2Value
            vm.$pixelTotal = 0
            vm._dragEnd = false;
            vm.dragstart = function(event, data) {
                vmodel.$pixelTotal = isHorizontal ? slider.offsetWidth : slider.offsetHeight
                Handlers = handlers  // 很关键，保证点击的手柄始终在Handlers中，之后就可以通过键盘方向键进行操作
                data.started = !vmodel.disabled
                data.dragX = data.dragY = false
                Index = handlers.indexOf(data.element)
                data.$element.addClass("ui-state-active")
                options.onDragStart.call(null, event, data);
            }
            vm.dragend = function(event, data, keyVal) {
                data.$element.removeClass("ui-state-active")
                // dragCaculate(event, data, keyVal)
                options.onDragEnd.call(null, event, data);
                vmodel._dragEnd = false; 
            }
            vm.drag = function(event, data, keyVal) {
                dragCaculate(event, data, keyVal)
                options.onDrag.call(null, vmodel, data);
                vmodel._dragEnd = true;
            }
            vm.$init = function() {
                var a = slider.getElementsByTagName("b")
                for (var i = 0, el; el = a[i++]; ) {
                    el.sliderModel = vmodel
                    if (!twohandlebars && avalon(el).hasClass("hander___flag")) {
                        handlers.push(el);
                        avalon(el).removeClass("hander___flag")
                        break;
                    } else if ( twohandlebars && !avalon(el).hasClass("hander___flag")) {
                        handlers.push(el);
                    } 
                }
                avalon(element).css({display: "none", height:0, width: 0, padding: 0})
                avalon(slider).css("width", vmodel.width)
                avalon.scan(slider, [vmodel].concat(vmodels))
                if (typeof options.onInit === "function" ){
                    //vmodels是不包括vmodel的
                    options.onInit.call(element, vmodel, options, vmodels)
                }
            }
            vm.$remove = function() {
                slider.innerHTML = slider.textContent = ""
                slider.parentNode.removeChild(slider);
            }
        })
        vmodel.$watch("value", function(val) {
            val = correctValue(Number(val) || 0);
            if (!val || val < Number(vmodel.min)) {
                val = 0;
            } else if (val > Number(vmodel.max)) {
                val = vmodel.max;
            }
            vmodel.value = val;
            vmodel.percent = value2Percent(val)
            if (!vmodel._dragEnd) {
                options.onDragEnd.call(null, data);
            }
        })
        function dragCaculate(event, data, keyVal) {
            if (isFinite(keyVal)) {
                var val = keyVal
            } else {
                var prop = isHorizontal ? "left" : "top"
                var pixelMouse = data[prop] + parseFloat(data.$element.css("border-top-width"))
                //如果是垂直时,往上拖,值就越大
                var percent = (pixelMouse / vmodel.$pixelTotal) //求出当前handler在slider的位置
                if (!isHorizontal) { // 垂直滑块，往上拖动时pixelMouse变小，下面才是真正的percent，所以需要调整percent
                    percent = Math.abs(1 - percent)
                }
                if (percent > 0.999) {
                    percent = 1
                }
                if (percent < 0.001) {
                    percent = 0
                }
                val = percent2Value(percent)
            }
            if (twohandlebars) { //水平时，小的0在左边，大的1在右边，垂直时，小的0在下边，大的1在上边
                if (Index === 0) { 
                    var check = vmodel.values[1]
                    if (val > check) {
                        val = check
                    }
                } else {
                    check = vmodel.values[0]
                    if (val < check) {
                        val = check
                    }
                }
                vmodel.values[Index] = val
                vmodel["percent" + Index] = value2Percent(val)
                vmodel.value = vmodel.values.join()
                vmodel.percent = value2Percent(vmodel.values[1] - vmodel.values[0] + valueMin)
            } else {
                vmodel.value = val
                vmodel.percent = value2Percent(val)
            }
        }
        return vmodel
    }
    widget.defaults = {
        max: 100,
        min: 0,
        width: -1,
        orientation: "horizontal",
        range: false,
        step: 1,
        value: 0,
        values: null,
        disabled: false,
        onDragStart: avalon.noop,
        onDrag: avalon.noop,
        onDragEnd: avalon.noop,
        getTemplate: function(str, options) {
            return str;
        }
    }
    avalon(document).bind("click", function(e) { // 当点击slider之外的区域取消选中状态
        e.stopPropagation();
        var el = e.target
        var Index = Handlers.indexOf(el)
        if (Index !== -1) {
            if (FocusElement) {
                FocusElement.removeClass("ui-state-focus");
            }
            FocusElement = avalon(el).addClass("ui-state-focus")
        } else if (FocusElement) {
            FocusElement.removeClass("ui-state-focus")
            FocusElement = null
        }
   })
    avalon(document).bind("keydown", function(e) { // 当选中某个手柄之后通过键盘上的方向键控制手柄的slider
        // e.preventDefault();
        if (FocusElement) {
            var vmodel = FocusElement[0].sliderModel
            var percent = Handlers.length == 1 ? vmodel.percent : vmodel["percent" + Index]
            var val = vmodel.$percent2Value(percent / 100), keyVal
            switch (e.which) {
                case 34 : // pageDown
                case 39:  // right
                case 38:  // down
                    keyVal = Math.min(val + 1, vmodel.$valueMax)
                    break;
                case 33: // pageUp
                case 37: // left
                case 40: // up
                    keyVal = Math.max(val - 1, vmodel.$valueMin)
                    break
                case 36: // home
                    keyVal = vmodel.$valueMin
                    break
                case 35: // end
                    keyVal = vmodel.$valueMax
                    break
            }
            if (isFinite(keyVal)) {
                vmodel.drag(e, {}, keyVal)
            }
        }
    })
    return avalon
})