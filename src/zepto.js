//     Zepto.js
//     (c) 2010-2017 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.


//从字面上看，自执行函数里面肯定会返回一个对象或者函数之类的
var Zepto = (function() {
  /* 
    1、很奇怪的声明了一个叫做undefined的标识符，undefined不是关键字和保留字，其实undefined 是global底下的一个属性（widnow.undefined是可以访问到的）；
    2、在ES5规范中，undefined、NaN、Infinity变成只读属性，
    3、这个地方声明了一个undefined，但是始终没有初始化，其实就是为了兼容一个undefined,避免window.undefined被重写而导致代码出现不准确。
  */
  var undefined,
   key,
    $,
    classList,
    emptyArray = [], 
    concat = emptyArray.concat, 
    filter = emptyArray.filter, 
    slice = emptyArray.slice,
    //这里保存了window上的document,避免每次都去最底层作用域查找这个字段
    document = window.document,
    elementDisplay = {}, 
    classCache = {},
    cssNumber = { 
      'column-count': 1, 
      'columns': 1, 
      'font-weight': 1, 
      'line-height': 1,
      'opacity': 1, 
      'z-index': 1, 
      'zoom': 1 
    },
    //html片段正则表达式
    //匹配<a-z、A-Z、0-9,以及下划线>单一的标签，首尾可以有空格，
    fragmentRE = /^\s*<(\w+|!)[^>]*>/,
    //单一的dom 字符片段如<tag></tag>; <tag>aa</tag>也不可以
    singleTagRE = /^<(\w+)\s*\/?>(?:<\/\1>|)$/,
    //增强的正则 将<div/> 格式化成<div></div>
    tagExpanderRE = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,
    rootNodeRE = /^(?:body|html)$/i,
    capitalRE = /([A-Z])/g,

    // special attributes that should be get/set via method calls
    methodAttributes = ['val', 'css', 'html', 'text', 'data', 'width', 'height', 'offset'],

    adjacencyOperators = [ 'after', 'prepend', 'before', 'append' ],

    //有些标签只可以被固定的标签包裹
    table = document.createElement('table'),
    tableRow = document.createElement('tr'),
    containers = {
      'tr': document.createElement('tbody'),
      'tbody': table, 
      'thead': table, 
      'tfoot': table,
      'td': tableRow, 
      'th': tableRow,
      '*': document.createElement('div')
    },
    //
    simpleSelectorRE = /^[\w-]*$/,
    class2type = {},
    toString = class2type.toString,
    zepto = {},
    camelize, 
    uniq,
    tempParent = document.createElement('div'),
    propMap = {
      'tabindex': 'tabIndex',
      'readonly': 'readOnly',
      'for': 'htmlFor',
      'class': 'className',
      'maxlength': 'maxLength',
      'cellspacing': 'cellSpacing',
      'cellpadding': 'cellPadding',
      'rowspan': 'rowSpan',
      'colspan': 'colSpan',
      'usemap': 'useMap',
      'frameborder': 'frameBorder',
      'contenteditable': 'contentEditable'
    },
    //是不是数组的方法，先使用ES5的isArray判断，如果没有这个方法，使用instanceof “不严谨的”判断
    isArray = Array.isArray ||
      function(object){ return object instanceof Array }

  zepto.matches = function(element, selector) {
    //如果传入的selelctor、 element、或者element的nodeType 不是元素节点，那么直接返回。 
    if (!selector || !element || element.nodeType !== 1) return false
    //polyFill matches方法
    var matchesSelector = element.matches || element.webkitMatchesSelector ||
                          element.mozMatchesSelector || element.oMatchesSelector ||
                          element.matchesSelector
    //如果方法可以执行。
    if (matchesSelector) return matchesSelector.call(element, selector)
    // fall back to performing a selector:

    var match, 
    parent = element.parentNode,
     temp = !parent
    if (temp) 
    (parent = tempParent).appendChild(element)
    match = ~zepto.qsa(parent, selector).indexOf(element)
    temp && tempParent.removeChild(element)
    return match
  }

  function type(obj) {
    return obj == null ? String(obj) :
      class2type[toString.call(obj)] || "object"
  }

  function isFunction(value) { return type(value) == "function" }

  function isWindow(obj)     { return obj != null && obj == obj.window }

  function isDocument(obj)   { return obj != null && obj.nodeType == obj.DOCUMENT_NODE }

  function isObject(obj)     { return type(obj) == "object" }

  function isPlainObject(obj) {
    return isObject(obj) && !isWindow(obj) && Object.getPrototypeOf(obj) == Object.prototype
  }

  //是不是类数组
  function likeArray(obj) {
    var length = !!obj && 'length' in obj && obj.length,
      type = $.type(obj)

    return 'function' != type && !isWindow(obj) && (
      'array' == type || length === 0 ||
        (typeof length == 'number' && length > 0 && (length - 1) in obj)
    )
  }

  //过滤数组去除null 或者undefined的数组项
  function compact(array) { 
    return filter.call(array, function(item){ 
      return item != null 
    })
   }

  //数组扁平化
  function flatten(array) { 
    return array.length > 0 ?
     $.fn.concat.apply([], array) 
     : array 
  }
  //驼峰化
  camelize = function(str){
    return str.replace(/-+(.)?/g, function(match, chr){ 
      return chr ? chr.toUpperCase() : '' 
    }) 
  }
  //将驼峰变量 - 化
  function dasherize(str) {
    return str.replace(/::/g, '/')
           .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
           .replace(/([a-z\d])([A-Z])/g, '$1_$2')
           .replace(/_/g, '-')
           .toLowerCase()
  }
  //数组去重，indexOf接受来个参数，第一个参数匹配的数据项，第二个参数开始的位置，
  //使用全等匹配到第一个值停止
  uniq = function(array){ 
    return filter.call(array, function(item, idx){ 
      return array.indexOf(item) == idx 
    }) 
  }

  //将正则表达式换存在一个对象里面，hasClass 方法中使用了这个函数
  function classRE(name) {
    return name in classCache ?
      classCache[name] : (classCache[name] = new RegExp('(^|\\s)' + name + '(\\s|$)'))
  }

  //添加px 单位，如果value是一个数字类型，并且不在cssNumber的集合中的 变量
  function maybeAddPx(name, value) {
    //typeof value 必然返回字符类型，这个地方更好的是使用全等
    return (typeof value == "number" && !cssNumber[dasherize(name)]) ? value + "px" : value
  }

  //
  function defaultDisplay(nodeName) {
    //声明俩个变量
    var element, 
    display
    //如果elementDisplay缓存对象里面不存在这个 名称的 node节点
    if (!elementDisplay[nodeName]) {
      //新建一个这个节点
      element = document.createElement(nodeName)
      //加载到body上
      document.body.appendChild(element)
      //使用getComputedStyle的方法获取 display
      display = getComputedStyle(element, '').getPropertyValue("display")
      //删除这个节点
      element.parentNode.removeChild(element)
      //如果dispay 的值是none，那么将diplay设置成block
      display == "none" && (display = "block")
      //缓存这个值
      elementDisplay[nodeName] = display
    }
    return elementDisplay[nodeName]
  }

  //拿到元素的孩子，children 方法可以返回它的nodeType=1的子级，childnodes返回所有类型的子级
  function children(element) {
    return 'children' in element ?
      slice.call(element.children) :
      $.map(element.childNodes, function(node){
         if (node.nodeType == 1) 
         return node 
        })
  }

  //这个是生成一个zepto对象的标准方法
  //new Z的时候，内部创建一个对象
  //this 指向这个对象
  //向这个对象赋值
  //return this 返回这个对象{0:xxx,1：xxx, length:2}
  function Z(dom, selector) {
    var i, len = dom ? dom.length : 0
    for (i = 0; i < len; i++) this[i] = dom[i]
    this.length = len
    this.selector = selector || ''
  }

  // `$.zepto.fragment` takes a html string and an optional tag name
  // to generate DOM nodes from the given html string.
  // The generated DOM nodes are returned as an array.
  // This function can be overridden in plugins for example to make
  // it compatible with browsers that don't support the DOM fully.
  //html fragment字符串 ，name 第一匹配组/w+ 匹配的字符串，properties 属性集合
  zepto.fragment = function(html, name, properties) {
    //最终返回
    var dom,
    nodes,
    container

    // A special case optimization for a single tag
    // 如果是单一的html片段如<tag></tag> 那么直接使用creteElement 创建，然后以nodes的那种方式进行处理
    if (singleTagRE.test(html)) dom = $(document.createElement(RegExp.$1))

    // 如果上面的代码没有执行 !dom返回true，
    // 这部分代码是进行复杂的html创建
    if (!dom) {
      //是否有替换的能力，格式化<div/>这种格式的字符为<div></div>,当然<img/>不需要格式化
      if (html.replace) html = html.replace(tagExpanderRE, "<$1></$2>")
      //如果没有传入name 那么把标签剥一层
      if (name === undefined) name = fragmentRE.test(html) && RegExp.$1
      //如果表签名不是 table 子标签或者 * ,那么name
      if (!(name in containers)) name = '*'

      container = containers[name]
      container.innerHTML = '' + html
      //这里的操作是获取容器里面的我们需要的元素集合，
      //$.each 会返回我们的迭代对象
      //使用数组的slice方法复制了一份我们需要的子node集合
      //但是我们创建的容器还是存在的，并且里面的子node不是我们想要的内容
      dom = $.each(slice.call(container.childNodes), function(){
        container.removeChild(this)
      })
    }
    //进行属性的操作
    if (isPlainObject(properties)) {
      nodes = $(dom)
      $.each(properties, function(key, value) {
        if (methodAttributes.indexOf(key) > -1) nodes[key](value)//还是调用自己的方法
        else nodes.attr(key, value)
      })
    }

    return dom
  }

  // `$.zepto.Z` swaps out the prototype of the given `dom` array
  // of nodes with `$.fn` and thus supplying all the Zepto functions
  // to the array. This method can be overridden in plugins.

  //这里是使用了工厂方法去获取一个Z，而不是new 一个Z
  zepto.Z = function(dom, selector) {
    return new Z(dom, selector)
  }

  // `$.zepto.isZ` should return `true` if the given object is a Zepto
  // collection. This method can be overridden in plugins.
  // isZ 是判断这个object是否是new zepto.Z；zepto.Z是一个普通的函数，并没有实质上去
  // new 一个zepto.z 而是return 了一个 Z 的实例。
  // 所以 从这里的代码看  Z.__proto__.constructor 并不是zepto.Z
  // 但是在代码最下方有段代码是 
  // zepto.Z.prototype = Z.prototype = $.fn
  // $.fn = {
  //  constructor: zepto.Z,
  //  ...
  // }
  // zepto.Z 和 Z 的 原型对象都指向了 $.fn  
  // 他们的构造函数也指向了 zepto.Z
  zepto.isZ = function(object) {
    return object instanceof zepto.Z
  }

  // `$.zepto.init` is Zepto's counterpart to jQuery's `$.fn.init` and 
  // takes a CSS selector and an optional context (and handles various
  // special cases).
  // This method can be overridden in plugins.

  //counterpart：副本 相对物 optional 可选的
  //这个zepto是上面用字面量生命并初始化的一个空对象，向这个对象添加一个init方法添加两个参数
  zepto.init = function(selector, context) {
    var dom
    // If nothing given, return an empty Zepto collection
    //如果选择器是个空，那么返回一个zepto.Z()，
    //zepto.Z 返回 new Z();
    //这里实际是返回了一个对象里面有俩个属性selelctor:'',length:0
    if (!selector) return zepto.Z()
    // Optimize for string selectors
    //如果是个字符串
    else if (typeof selector == 'string') {
      //es5添加的删除首尾空格，返回一个新的文本副本，不会影响原来的文本
      selector = selector.trim()
      // If it's a html fragment, create nodes from it
      // Note: In both Chrome 21 and Firefox 15, DOM error 12
      // is thrown if the fragment doesn't begin with <
      // 针对于的业务场景是 $(htmlString) 这种要构建一个zepto对象
      // 如果是一个html片段开始于< 且<(a-z、A-Z、0-9,以及下划线|!这种是不是doctype)>的标签，首尾可以有空格
      // ps：这种使用[index]访问单个字符的方法是ES5提供的，ie8和其它浏览器支持这中访问方式，
      // 在IE7以及一下会返回undefined
      if (selector[0] == '<' && fragmentRE.test(selector))
      // RegExp.$1 第一个捕获组 正常的html标签,返回的是标签的名称，selector置为空
        dom = zepto.fragment(selector, RegExp.$1, context), selector = null
      // If there's a context, create a collection on that context first, and select
      // nodes from there
      //如果存在context 在$(context)前提下查找选择器的内容
      else if (context !== undefined) return $(context).find(selector)
      // If it's a CSS selector, use it to select nodes.
      //如果是css 选择器，那么使用样式去查找node
      else dom = zepto.qsa(document, selector)
    }
    // If a function is given, call it when the DOM is ready
    else if (isFunction(selector)) return $(document).ready(selector)
    // If a Zepto collection is given, just return it
    else if (zepto.isZ(selector)) return selector
    else {
      // normalize array if an array of nodes is given
      //如果给一个数组 会过滤掉里面的null 和undefined
      if (isArray(selector)) dom = compact(selector)
      // Wrap DOM nodes.如果是一个对象 包括node对象
      else if (isObject(selector))
        dom = [selector], selector = null
      // If it's a html fragment, create nodes from it
      else if (fragmentRE.test(selector))
        dom = zepto.fragment(selector.trim(), RegExp.$1, context), selector = null
      // If there's a context, create a collection on that context first, and select
      // nodes from there
      else if (context !== undefined) return $(context).find(selector)
      // And last but no least, if it's a CSS selector, use it to select nodes.
      else dom = zepto.qsa(document, selector)
    }
    // create a new Zepto collection from the nodes found
    return zepto.Z(dom, selector)
  }

  // `$` will be the base `Zepto` object. When calling this
  // function just call `$.zepto.init, which makes the implementation
  // details of selecting nodes and creating Zepto collections
  // patchable in plugins.

  /* 
    最终返回的是这个函数  $(selector,context)
    selector 是选择器，context 是当前选择器的命名空间，表示从
    当前的dom查找它的子级
  */
  $ = function(selector, context){
    return zepto.init(selector, context)
  }

  //遍历对象的里面的属性
  function extend(target, source, deep) {
    for (key in source){
      //如果是深度复制而且是数组或者对象
      if (deep && (isPlainObject(source[key]) || isArray(source[key]))) {
        if (isPlainObject(source[key]) && !isPlainObject(target[key])){
          target[key] = {}
        }
        if (isArray(source[key]) && !isArray(target[key])){
          target[key] = []
        }
        extend(target[key], source[key], deep)
      }
      //如果不是深度复制
      else if (source[key] !== undefined) {
        target[key] = source[key]
      }
    }
  }

  // Copy all but undefined properties from one or more
  // objects to the `target` object.
  $.extend = function(target){
    var deep, args = slice.call(arguments, 1)
    if (typeof target == 'boolean') {
      deep = target
      target = args.shift()
    }
    args.forEach(function(arg){ extend(target, arg, deep) })
    return target
  }

  // `$.zepto.qsa` is Zepto's CSS selector implementation which
  // uses `document.querySelectorAll` and optimizes for some special cases, like `#id`.
  // This method can be overridden in plugins.
  //使用css选择器进行dom的获取  在zepto.init方法中element是document
  //实现思想：
  //1、首先判断是否有document.getElementById的能力 并且是否符合document.getElementById条件
  //2、如果element 不是元素、document、documentFragment节点 返回空数组
  //3、如果是单一的字符串 尝试 是否可以使用 getElementsByClassName 或者 getElementsByTagName
  //4、如果是body span这种复杂的字符串尝试使用querySelectorAll
  zepto.qsa = function(element, selector){
    var found,
        //selector为#id的这种选择器
        maybeID = selector[0] == '#',
        //!maybeID 就是非#id这种情况，然后判断是否是.class这种情况
        maybeClass = !maybeID && selector[0] == '.',
        // Ensure that a 1 char tag name still gets checked
        //如果是两者之中的一种 那么去掉“.”或者“#”，返回剩下的字符串，如果
        //都不符合，那么返回完整的selector
        nameOnly = maybeID || maybeClass ? selector.slice(1) : selector, 
        //这个正则只是检测是否是一个单一的字符串 字符串包括a-zA-Z0-9 _ -
        isSimple = simpleSelectorRE.test(nameOnly)
        /* 
        此处的代码格式化：
        // 判断符合ID选择器的三个条件
        // 1、element(document).getElementById 存在
        // 2、是一个简单的字符
        // 3、并且是# a-zA-Z0-9 _ - 这中类型的值
        // 1 是浏览器的能力检测，2和3判断是否符合ID选择器的条件
        if(element.getElementById && isSimple && maybeID){
          // 如果可以拿到这个dom对象，那么把它放入一个数组里面，否则是个空数组
          if(element.getElementById(nameOnly)){
            found = [element.getElementById(nameOnly)];
          }else{
            found = [];
          }
          return found;
          //当前的传入的这个element节点的节点类型
          //1、不是元素节点类型
          //2、不是document 节点
          //3、不是documentFragment节点
        }else if(element.nodeType !== 1 && element.nodeType !== 9 && element.nodeType !== 11){
          //返回空
          return []
        }else{
          //调用空数组的slice方法
          return slice.call(
            //如果是单一的字符串 && 不是ID && 存在getElementsByClassName方法
            if(isSimple && !maybeID && element.getElementsByClassName){
              //如果是 class 选择器
              if(maybeClass){
                element.getElementsByClassName
              }else{
                element.getElementsByTagName(selector)
              }
            }else{
              element.querySelectorAll(selector)
            }
          )
        }
        */
    return (element.getElementById && isSimple && maybeID) ? // Safari DocumentFragment doesn't have getElementById
      ( (found = element.getElementById(nameOnly)) ? [found] : [] ) :
      (element.nodeType !== 1 && element.nodeType !== 9 && element.nodeType !== 11) ? [] :
      slice.call(
        isSimple && !maybeID && element.getElementsByClassName ? // DocumentFragment doesn't have getElementsByClassName/TagName
          maybeClass ? element.getElementsByClassName(nameOnly) : // If it's simple, it could be a class
          element.getElementsByTagName(selector) : // Or a tag
          element.querySelectorAll(selector) // Or it's not simple, and we need to query all
      )
  }

  function filtered(nodes, selector) {
    return selector == null ? $(nodes) : $(nodes).filter(selector)
  }

  $.contains = document.documentElement.contains ?
  //使用原生的方法来判断是否包含这个元素
    function(parent, node) {
      return parent !== node && parent.contains(node)
    } :
    //使用递归来判断是否包含
    function(parent, node) {
      while (node && (node = node.parentNode))
        if (node === parent) return true
      return false
    }

  function funcArg(context, arg, idx, payload) {
    return isFunction(arg) ? arg.call(context, idx, payload) : arg
  }

  //如果value === null || value === undefined 删除当前node的这个属性
  function setAttribute(node, name, value) {
    value == null ? node.removeAttribute(name) : node.setAttribute(name, value)
  }

  // access className property while respecting SVGAnimatedString
  function className(node, value){
    var klass = node.className || '',
        svg   = klass && klass.baseVal !== undefined

    if (value === undefined) return svg ? klass.baseVal : klass
    svg ? (klass.baseVal = value) : (node.className = value)
  }

  // "true"  => true
  // "false" => false
  // "null"  => null
  // "42"    => 42
  // "42.5"  => 42.5
  // "08"    => "08"
  // JSON    => parse if valid
  // String  => self
  function deserializeValue(value) {
    try {
      return value ?
        value == "true" ||
        ( value == "false" ? false :
          value == "null" ? null :
          +value + "" == value ? +value :
          /^[\[\{]/.test(value) ? $.parseJSON(value) :
          value )
        : value
    } catch(e) {
      return value
    }
  }

  $.type = type
  $.isFunction = isFunction
  $.isWindow = isWindow
  $.isArray = isArray
  $.isPlainObject = isPlainObject

  $.isEmptyObject = function(obj) {
    //如果不是空，可以执行这个obj 不会走return true那句
    var name
    for (name in obj) return false
    return true
  }

  //是不是数字
  $.isNumeric = function(val) {
    var num = Number(val), 
    type = typeof val
    return 
    //val !== null 或者 !== undefined
    val != null && 
    // 类型不属于boolean
    type != 'boolean'&&
    // 类型不属于字符串或者 val的长度不为0 
    (type != 'string' || val.length)&&
    //不是NaN
    !isNaN(num) &&
    //是无穷位数吗
    isFinite(num) || 
    false
  }

  //是否在数组里面
  $.inArray = function(elem, array, i){
    return emptyArray.indexOf.call(array, elem, i)
  }

  //驼峰化命名规则
  $.camelCase = camelize
  
  //首尾去空格
  $.trim = function(str) {
    return str == null ? "" : String.prototype.trim.call(str)
  }

  // plugin compatibility
  $.uuid = 0
  $.support = { }
  $.expr = { }
  $.noop = function() {}

  $.map = function(elements, callback){
    var value, values = [], i, key
    if (likeArray(elements))
      for (i = 0; i < elements.length; i++) {
        value = callback(elements[i], i)
        if (value != null) values.push(value)
      }
    else
      for (key in elements) {
        value = callback(elements[key], key)
        if (value != null) values.push(value)
      }
    return flatten(values)
  }

  $.each = function(elements, callback){
    var i, key
    if (likeArray(elements)) {
      for (i = 0; i < elements.length; i++)
        if (callback.call(elements[i], i, elements[i]) === false) return elements
    } else {
      for (key in elements)
        if (callback.call(elements[key], key, elements[key]) === false) return elements
    }

    return elements
  }

  $.grep = function(elements, callback){
    return filter.call(elements, callback)
  }

  if (window.JSON) $.parseJSON = JSON.parse

  // Populate the class2type map
  /* 
  class2type = {
    [object Boolean]: boolean
    ...
  }
  
  */
  $.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {
    class2type[ "[object " + name + "]" ] = name.toLowerCase()
  })

  // Define methods that will be available on all
  // Zepto collections
  $.fn = {
    constructor: zepto.Z,
    length: 0,

    // Because a collection acts like an array
    // copy over these useful array functions.
    forEach: emptyArray.forEach,
    reduce: emptyArray.reduce,
    push: emptyArray.push,
    sort: emptyArray.sort,
    splice: emptyArray.splice,
    indexOf: emptyArray.indexOf,
    concat: function(){
      var i, value, args = []
      for (i = 0; i < arguments.length; i++) {
        value = arguments[i]
        args[i] = zepto.isZ(value) ? value.toArray() : value
      }
      return concat.apply(zepto.isZ(this) ? this.toArray() : this, args)
    },

    // `map` and `slice` in the jQuery API work differently
    // from their array counterparts
    map: function(fn){
      return $($.map(this, function(el, i){ return fn.call(el, i, el) }))
    },
    slice: function(){
      return $(slice.apply(this, arguments))
    },

    ready: function(callback){
      // don't use "interactive" on IE <= 10 (it can fired premature)
      if (document.readyState === "complete" ||
          (document.readyState !== "loading" && !document.documentElement.doScroll))
        setTimeout(function(){ callback($) }, 0)
      else {
        var handler = function() {
          document.removeEventListener("DOMContentLoaded", handler, false)
          window.removeEventListener("load", handler, false)
          callback($)
        }
        document.addEventListener("DOMContentLoaded", handler, false)
        window.addEventListener("load", handler, false)
      }
      return this
    },
    get: function(idx){
      return idx === undefined ? slice.call(this) : this[idx >= 0 ? idx : idx + this.length]
    },
    toArray: function(){ return this.get() },
    size: function(){
      return this.length
    },
    remove: function(){
      return this.each(function(){
        if (this.parentNode != null)
          this.parentNode.removeChild(this)
      })
    },
    each: function(callback){
      emptyArray.every.call(this, function(el, idx){
        return callback.call(el, idx, el) !== false
      })
      return this
    },
    filter: function(selector){
      if (isFunction(selector)) return this.not(this.not(selector))
      return $(filter.call(this, function(element){
        return zepto.matches(element, selector)
      }))
    },
    add: function(selector,context){
      return $(uniq(this.concat($(selector,context))))
    },
    is: function(selector){
      return typeof selector == 'string' ? this.length > 0 && zepto.matches(this[0], selector) : 
          selector && this.selector == selector.selector
    },
    not: function(selector){
      var nodes=[]
      if (isFunction(selector) && selector.call !== undefined)
        this.each(function(idx){
          if (!selector.call(this,idx)) nodes.push(this)
        })
      else {
        var excludes = typeof selector == 'string' ? this.filter(selector) :
          (likeArray(selector) && isFunction(selector.item)) ? slice.call(selector) : $(selector)
        this.forEach(function(el){
          if (excludes.indexOf(el) < 0) nodes.push(el)
        })
      }
      return $(nodes)
    },
    has: function(selector){
      return this.filter(function(){
        return isObject(selector) ?
          $.contains(this, selector) :
          $(this).find(selector).size()
      })
    },
    eq: function(idx){
      return idx === -1 ? this.slice(idx) : this.slice(idx, + idx + 1)
    },
    first: function(){
      var el = this[0]
      return el && !isObject(el) ? el : $(el)
    },
    last: function(){
      var el = this[this.length - 1]
      return el && !isObject(el) ? el : $(el)
    },
    find: function(selector){
      var result, $this = this
      if (!selector) result = $()
      else if (typeof selector == 'object')
        result = $(selector).filter(function(){
          var node = this
          return emptyArray.some.call($this, function(parent){
            return $.contains(parent, node)
          })
        })
      else if (this.length == 1) result = $(zepto.qsa(this[0], selector))
      else result = this.map(function(){ return zepto.qsa(this, selector) })
      return result
    },
    closest: function(selector, context){
      var nodes = [], collection = typeof selector == 'object' && $(selector)
      this.each(function(_, node){
        while (node && !(collection ? collection.indexOf(node) >= 0 : zepto.matches(node, selector)))
          node = node !== context && !isDocument(node) && node.parentNode
        if (node && nodes.indexOf(node) < 0) nodes.push(node)
      })
      return $(nodes)
    },
    parents: function(selector){
      var ancestors = [], nodes = this
      while (nodes.length > 0)
        nodes = $.map(nodes, function(node){
          if ((node = node.parentNode) && !isDocument(node) && ancestors.indexOf(node) < 0) {
            ancestors.push(node)
            return node
          }
        })
      return filtered(ancestors, selector)
    },
    parent: function(selector){
      return filtered(uniq(this.pluck('parentNode')), selector)
    },
    children: function(selector){
      return filtered(this.map(function(){ return children(this) }), selector)
    },
    contents: function() {
      return this.map(function() { return this.contentDocument || slice.call(this.childNodes) })
    },
    siblings: function(selector){
      return filtered(this.map(function(i, el){
        return filter.call(children(el.parentNode), function(child){ return child!==el })
      }), selector)
    },
    empty: function(){
      return this.each(function(){ this.innerHTML = '' })
    },
    // `pluck` is borrowed from Prototype.js
    pluck: function(property){
      return $.map(this, function(el){ return el[property] })
    },
    show: function(){
      return this.each(function(){
        this.style.display == "none" && (this.style.display = '')
        if (getComputedStyle(this, '').getPropertyValue("display") == "none")
          this.style.display = defaultDisplay(this.nodeName)
      })
    },
    replaceWith: function(newContent){
      return this.before(newContent).remove()
    },
    wrap: function(structure){
      var func = isFunction(structure)
      if (this[0] && !func)
        var dom   = $(structure).get(0),
            clone = dom.parentNode || this.length > 1

      return this.each(function(index){
        $(this).wrapAll(
          func ? structure.call(this, index) :
            clone ? dom.cloneNode(true) : dom
        )
      })
    },
    wrapAll: function(structure){
      if (this[0]) {
        $(this[0]).before(structure = $(structure))
        var children
        // drill down to the inmost element
        while ((children = structure.children()).length) structure = children.first()
        $(structure).append(this)
      }
      return this
    },
    wrapInner: function(structure){
      var func = isFunction(structure)
      return this.each(function(index){
        var self = $(this), contents = self.contents(),
            dom  = func ? structure.call(this, index) : structure
        contents.length ? contents.wrapAll(dom) : self.append(dom)
      })
    },
    unwrap: function(){
      this.parent().each(function(){
        $(this).replaceWith($(this).children())
      })
      return this
    },
    clone: function(){
      return this.map(function(){ return this.cloneNode(true) })
    },
    hide: function(){
      return this.css("display", "none")
    },
    toggle: function(setting){
      return this.each(function(){
        var el = $(this)
        ;(setting === undefined ? el.css("display") == "none" : setting) ? el.show() : el.hide()
      })
    },
    prev: function(selector){ return $(this.pluck('previousElementSibling')).filter(selector || '*') },
    next: function(selector){ return $(this.pluck('nextElementSibling')).filter(selector || '*') },
    html: function(html){
      return 0 in arguments ?
        this.each(function(idx){
          var originHtml = this.innerHTML
          $(this).empty().append( funcArg(this, html, idx, originHtml) )
        }) :
        (0 in this ? this[0].innerHTML : null)
    },
    text: function(text){
      return 0 in arguments ?
        this.each(function(idx){
          var newText = funcArg(this, text, idx, this.textContent)
          this.textContent = newText == null ? '' : ''+newText
        }) :
        (0 in this ? this.pluck('textContent').join("") : null)
    },
    attr: function(name, value){
      var result
      return (typeof name == 'string' && !(1 in arguments)) ?
        (0 in this && this[0].nodeType == 1 && (result = this[0].getAttribute(name)) != null ? result : undefined) :
        this.each(function(idx){
          if (this.nodeType !== 1) return
          if (isObject(name)) for (key in name) setAttribute(this, key, name[key])
          else setAttribute(this, name, funcArg(this, value, idx, this.getAttribute(name)))
        })
    },
    removeAttr: function(name){
      return this.each(function(){ this.nodeType === 1 && name.split(' ').forEach(function(attribute){
        setAttribute(this, attribute)
      }, this)})
    },
    prop: function(name, value){
      name = propMap[name] || name
      return (typeof name == 'string' && !(1 in arguments)) ?
        (this[0] && this[0][name]) :
        this.each(function(idx){
          if (isObject(name)) for (key in name) this[propMap[key] || key] = name[key]
          else this[name] = funcArg(this, value, idx, this[name])
        })
    },
    removeProp: function(name){
      name = propMap[name] || name
      return this.each(function(){ delete this[name] })
    },
    data: function(name, value){
      var attrName = 'data-' + name.replace(capitalRE, '-$1').toLowerCase()

      var data = (1 in arguments) ?
        this.attr(attrName, value) :
        this.attr(attrName)

      return data !== null ? deserializeValue(data) : undefined
    },
    val: function(value){
      if (0 in arguments) {
        if (value == null) value = ""
        return this.each(function(idx){
          this.value = funcArg(this, value, idx, this.value)
        })
      } else {
        return this[0] && (this[0].multiple ?
           $(this[0]).find('option').filter(function(){ return this.selected }).pluck('value') :
           this[0].value)
      }
    },
    offset: function(coordinates){
      if (coordinates) return this.each(function(index){
        var $this = $(this),
            coords = funcArg(this, coordinates, index, $this.offset()),
            parentOffset = $this.offsetParent().offset(),
            props = {
              top:  coords.top  - parentOffset.top,
              left: coords.left - parentOffset.left
            }

        if ($this.css('position') == 'static') props['position'] = 'relative'
        $this.css(props)
      })
      if (!this.length) return null
      if (document.documentElement !== this[0] && !$.contains(document.documentElement, this[0]))
        return {top: 0, left: 0}
      var obj = this[0].getBoundingClientRect()
      return {
        left: obj.left + window.pageXOffset,
        top: obj.top + window.pageYOffset,
        width: Math.round(obj.width),
        height: Math.round(obj.height)
      }
    },
    css: function(property, value){
      if (arguments.length < 2) {
        var element = this[0]
        if (typeof property == 'string') {
          if (!element) return
          return element.style[camelize(property)] || getComputedStyle(element, '').getPropertyValue(property)
        } else if (isArray(property)) {
          if (!element) return
          var props = {}
          var computedStyle = getComputedStyle(element, '')
          $.each(property, function(_, prop){
            props[prop] = (element.style[camelize(prop)] || computedStyle.getPropertyValue(prop))
          })
          return props
        }
      }

      var css = ''
      if (type(property) == 'string') {
        if (!value && value !== 0)
          this.each(function(){ this.style.removeProperty(dasherize(property)) })
        else
          css = dasherize(property) + ":" + maybeAddPx(property, value)
      } else {
        for (key in property)
          if (!property[key] && property[key] !== 0)
            this.each(function(){ this.style.removeProperty(dasherize(key)) })
          else
            css += dasherize(key) + ':' + maybeAddPx(key, property[key]) + ';'
      }

      return this.each(function(){ this.style.cssText += ';' + css })
    },
    index: function(element){
      return element ? this.indexOf($(element)[0]) : this.parent().children().indexOf(this[0])
    },
    hasClass: function(name){
      if (!name) return false
      return emptyArray.some.call(this, function(el){
        return this.test(className(el))
      }, classRE(name))
    },
    addClass: function(name){
      if (!name) return this
      return this.each(function(idx){
        if (!('className' in this)) return
        classList = []
        var cls = className(this), newName = funcArg(this, name, idx, cls)
        newName.split(/\s+/g).forEach(function(klass){
          if (!$(this).hasClass(klass)) classList.push(klass)
        }, this)
        classList.length && className(this, cls + (cls ? " " : "") + classList.join(" "))
      })
    },
    removeClass: function(name){
      return this.each(function(idx){
        if (!('className' in this)) return
        if (name === undefined) return className(this, '')
        classList = className(this)
        funcArg(this, name, idx, classList).split(/\s+/g).forEach(function(klass){
          classList = classList.replace(classRE(klass), " ")
        })
        className(this, classList.trim())
      })
    },
    toggleClass: function(name, when){
      if (!name) return this
      return this.each(function(idx){
        var $this = $(this), names = funcArg(this, name, idx, className(this))
        names.split(/\s+/g).forEach(function(klass){
          (when === undefined ? !$this.hasClass(klass) : when) ?
            $this.addClass(klass) : $this.removeClass(klass)
        })
      })
    },
    scrollTop: function(value){
      if (!this.length) return
      var hasScrollTop = 'scrollTop' in this[0]
      if (value === undefined) return hasScrollTop ? this[0].scrollTop : this[0].pageYOffset
      return this.each(hasScrollTop ?
        function(){ this.scrollTop = value } :
        function(){ this.scrollTo(this.scrollX, value) })
    },
    scrollLeft: function(value){
      if (!this.length) return
      var hasScrollLeft = 'scrollLeft' in this[0]
      if (value === undefined) return hasScrollLeft ? this[0].scrollLeft : this[0].pageXOffset
      return this.each(hasScrollLeft ?
        function(){ this.scrollLeft = value } :
        function(){ this.scrollTo(value, this.scrollY) })
    },
    position: function() {
      if (!this.length) return

      var elem = this[0],
        // Get *real* offsetParent
        offsetParent = this.offsetParent(),
        // Get correct offsets
        offset       = this.offset(),
        parentOffset = rootNodeRE.test(offsetParent[0].nodeName) ? { top: 0, left: 0 } : offsetParent.offset()

      // Subtract element margins
      // note: when an element has margin: auto the offsetLeft and marginLeft
      // are the same in Safari causing offset.left to incorrectly be 0
      offset.top  -= parseFloat( $(elem).css('margin-top') ) || 0
      offset.left -= parseFloat( $(elem).css('margin-left') ) || 0

      // Add offsetParent borders
      parentOffset.top  += parseFloat( $(offsetParent[0]).css('border-top-width') ) || 0
      parentOffset.left += parseFloat( $(offsetParent[0]).css('border-left-width') ) || 0

      // Subtract the two offsets
      return {
        top:  offset.top  - parentOffset.top,
        left: offset.left - parentOffset.left
      }
    },
    offsetParent: function() {
      return this.map(function(){
        var parent = this.offsetParent || document.body
        while (parent && !rootNodeRE.test(parent.nodeName) && $(parent).css("position") == "static")
          parent = parent.offsetParent
        return parent
      })
    }
  }

  // for now
  $.fn.detach = $.fn.remove

  // Generate the `width` and `height` functions
  ;['width', 'height'].forEach(function(dimension){
    var dimensionProperty =
      dimension.replace(/./, function(m){ return m[0].toUpperCase() })

    $.fn[dimension] = function(value){
      var offset, el = this[0]
      if (value === undefined) return isWindow(el) ? el['inner' + dimensionProperty] :
        isDocument(el) ? el.documentElement['scroll' + dimensionProperty] :
        (offset = this.offset()) && offset[dimension]
      else return this.each(function(idx){
        el = $(this)
        el.css(dimension, funcArg(this, value, idx, el[dimension]()))
      })
    }
  })

  function traverseNode(node, fun) {
    fun(node)
    for (var i = 0, len = node.childNodes.length; i < len; i++)
      traverseNode(node.childNodes[i], fun)
  }

  // Generate the `after`, `prepend`, `before`, `append`,
  // `insertAfter`, `insertBefore`, `appendTo`, and `prependTo` methods.
  adjacencyOperators.forEach(function(operator, operatorIndex) {
    var inside = operatorIndex % 2 //=> prepend, append

    $.fn[operator] = function(){
      // arguments can be nodes, arrays of nodes, Zepto objects and HTML strings
      var argType, nodes = $.map(arguments, function(arg) {
            var arr = []
            argType = type(arg)
            if (argType == "array") {
              arg.forEach(function(el) {
                if (el.nodeType !== undefined) return arr.push(el)
                else if ($.zepto.isZ(el)) return arr = arr.concat(el.get())
                arr = arr.concat(zepto.fragment(el))
              })
              return arr
            }
            return argType == "object" || arg == null ?
              arg : zepto.fragment(arg)
          }),
          parent, copyByClone = this.length > 1
      if (nodes.length < 1) return this

      return this.each(function(_, target){
        parent = inside ? target : target.parentNode

        // convert all methods to a "before" operation
        target = operatorIndex == 0 ? target.nextSibling :
                 operatorIndex == 1 ? target.firstChild :
                 operatorIndex == 2 ? target :
                 null

        var parentInDocument = $.contains(document.documentElement, parent)

        nodes.forEach(function(node){
          if (copyByClone) node = node.cloneNode(true)
          else if (!parent) return $(node).remove()

          parent.insertBefore(node, target)
          if (parentInDocument) traverseNode(node, function(el){
            if (el.nodeName != null && el.nodeName.toUpperCase() === 'SCRIPT' &&
               (!el.type || el.type === 'text/javascript') && !el.src){
              var target = el.ownerDocument ? el.ownerDocument.defaultView : window
              target['eval'].call(target, el.innerHTML)
            }
          })
        })
      })
    }

    // after    => insertAfter
    // prepend  => prependTo
    // before   => insertBefore
    // append   => appendTo
    $.fn[inside ? operator+'To' : 'insert'+(operatorIndex ? 'Before' : 'After')] = function(html){
      $(html)[operator](this)
      return this
    }
  })

  zepto.Z.prototype = Z.prototype = $.fn

  // Export internal API functions in the `$.zepto` namespace
  zepto.uniq = uniq
  zepto.deserializeValue = deserializeValue

  //将封装了很多方法的zepto对象挂载在$.zepto属性上
  $.zepto = zepto

  return $
})()

// If `$` is not yet defined, point it to `Zepto`
// 全局window添加Zepto属性并指向Zepto
window.Zepto = Zepto
/*如果 window的属性$ 标识符没有被使用，那么将window.$ 指向给Zepto
  这样做的好处是 避免zepto把之前定义的方法或者对象覆盖掉
  这里window.$ 是全等于 undefined 也就是在属性$没有被声明过时，而不是window.$ == null时
  window.$ == null 会发生类型转换 等于 window.$ === null || window.$ == undefined
  以下是zepto文档的描述：
   如果$变量尚未定义，Zepto只设置了全局变量$指向它本身。
   允许您同时使用的Zepto和有用的遗留代码，例如，prototype.js。
   只要首先加载Prototype，Zepto将不会覆盖Prototype的 $ 函数。Zepto将始终设置全局变量Zepto指向它本身。

*/
window.$ === undefined && (window.$ = Zepto)
