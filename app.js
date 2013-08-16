$(function () {

	var loader = $.loadSubScript;

	var syncJSONLoader = function (src) {
		return loader(src, null, null, false, true);
	};

	var modules = (function () {
		var cache = {};
		var ld = function (name, scp, callback) {
			var src = './modules/' + name + '.js';
			var obj = loader(src, scp || scope, callback || null, false);
			cache[name] = obj;
			return obj;
		};
		return function (name, scp, callback, reload) {
			if (cache[name] && (!reload)) {
				return cache[name];
			}
			return ld(name, scp, callback);
		};
	})();

	var ls = {
		get : function (prop) {
			var item = window.localStorage.getItem('Fine Cut LS');
			var obj = null;
			if (item) {
				try {
					obj = JSON.parse(item);
					if (prop) {
						return obj[prop];
					}
				} catch (e) {
					window.localStorage.removeItem('Fine Cut LS');
				}
			}
			return obj;
		},
		set : function (prop, value) {
			var obj = ls.get() || {};
			obj[prop] = value;
			window.localStorage.setItem('Fine Cut LS', JSON.stringify(obj));
		},
		setPageBorder : function (w) {
			ls.set('pageBorderWidth', w);
		},
		getPageBorder : function () {
			return ls.get().pageBorderWidth;
		}
	};

	var locale = {
		name : 'en-en',
		path : function () {
			return './ui/i18n/' + this.name + '.js';
		}
	};

	var config = {
		locale : syncJSONLoader(locale.path()),
		links : {
			// main : ['notes', 'files', 'settings']
			main : ['notes', 'settings']
		},
		settings : null,
		blank_page : {
			// title : '',
			// header : '',
			page : '',
			props : {},
			type : 'default'
		},
		pageScope : null,
		treeController : null,
		props : {
			pageBorder : 'PageController_PageBorder',
			activeTab : 'PageController_ActiveTab'

		}
	};

	var makePaths = function () {
		config.paths = {
			options : baseUrl + '/options/',
			project : {
				getall : baseUrl + 'project/getall/'
			},
			tree : {
				get : baseUrl + 'note/getbranch/',
				close : baseUrl + 'tree/close/'
			},
			page : {
				get : baseUrl + 'note/getcontent/',
				set : baseUrl + 'note/setcontent/',
				create : baseUrl + 'note/create/',
				del : baseUrl + 'note/delete/',
				rename : baseUrl + 'note/rename/',
				move : baseUrl + 'note/move/'
			}
		};
	};

	var info = function (str, pre) {
		var to = $('#info');
		to.removeClass('hide');
		if (pre) {
			to.html('<pre>' + str + '</pre>');
		} else {
			to.html(str);
		}
	};

	var jData = function (str) {
		return js_beautify(JSON.stringify(str), {
			indent_size : 1,
			indent_char : '\t',
			brace_style : 'collapse'
		});
	};

	var ajax = function (path, successCallback, opts, errorCallback) {
		var obj = {
			method : "POST",
			async : false,
			dataType : 'text',
			url : path,
			success : function (data) {
				if (data) {
					if (successCallback) {
						var obj = undefined;
						try {
							var obj = $.parseJSON(data);
						} catch (e) {
							if (errorCallback) {
								errorCallback(data);
							} else {
								info(data + '<hr>' + e.stack || e, true);
							}
						}
						if (obj) {
							successCallback(obj);
						} else {
							errorCallback && errorCallback(data);
						}
					}
				} else {
					if (errorCallback) {
						errorCallback(data);
					} else {
						info('no data');
					}
				}
			},
			error : function (response) {
				if (errorCallback) {
					errorCallback(response);
				} else {
					info(response.responseText);
				}
			}
		};
		opts && ($.extend(true, obj, opts));
		$.ajax(obj);
	};

	var project = null;
	var projects = [];

	var makeProjects = function () {
		ajax(config.paths.project.getall, function (obj) {
			projects = obj.data;
			project = projects[0].id;
		}, {
			method : 'GET'
		});
	};

	var baseUrl = ls.get('baseUrl');
	if (baseUrl) {
		makePaths();
		makeProjects();
	} else {
		ls.set('baseUrl', '');
		baseUrl = ls.get('baseUrl');
		makePaths();
	}

	var blankPage = function (wth) {
		var val = $.extend(true, {}, config.blank_page);
		if (wth) {
			return $.extend(true, val, wth);
		}
		return val;
	};

	var currentHeight = function (asString, minus) {
		!minus && (minus = 0);
		var h = parseInt($('#container').css('minHeight')) - minus;
		asString && (h += 'px');
		return h;
	};

	var setSizes = function () {
		$('#container').css({
			'minHeight' : '' + ($(document).height() - 75) + 'px'
		});
	};
	$(window).on('resize', function () {
		setSizes();
	});

	// var angular = angular.noConflict();

	var parsePageModel = function (data, obj) {
		if (!obj) {
			var obj = blankPage();
			if (data) {
				obj = JSON.parse(data.model);
				obj.page = data.page;
			}
		}
		var $scope = config.pageScope;
		if ($scope) {
			$scope.model = obj;
			if ($scope.$$childTail && $scope.$$childTail.model) {
				$scope.$$childTail.model = obj;
			}
			pageDigest(function () {
				// var el = config.editorControl[0];
				// el.clear();
				// config.editor.val(config.pageScope.model.page);
				// config.editorControl[0].updateFrame();
			});
		}
	};

	var pageDigestCounter = 0;
	var pageDigest = function (callback) {
		pageDigestCounter++;
		var buffer = 0 + pageDigestCounter;
		window.setTimeout(function () {
			if (buffer == pageDigestCounter) {
				pageDigestCounter = 0;
				try {
					config.pageScope.$digest();
					callback && callback();
				} catch (e) {
					debugger;
				}
			}
		}, 10);
	};

	var treeConfig = {
		focusParentOnClose : true,
		init : {
			method : 'slideDown',
			auto : false
		},
		loader : function (path, callback, leaf) {
			var path = JSON.stringify(path);
			var opts = {
				async : false,
				method : 'GET'
			};

			var url = config.paths.tree.get;
			if (leaf && leaf.id) {
				url += '?parentId=' + leaf.id;
			}

			ajax(url, function (obj) {
				if (obj.result && obj.data) {
					var dObj = {}
					$.map(obj.data, function (value) {
						dObj[value.id] = value;
					});
					callback(dObj);
				}
			}, opts);
		},
		handlers : {
			focus : function (leaf, controller) {
				if (leaf.parent) {
					var path = controller.getPath(leaf);
					var url = config.paths.page.get;
					if (leaf && leaf.id) {
						url += '?noteId=' + leaf.id;
						ajax(url, function (obj) {
							if (obj.result) {
								var lPage = blankPage(leaf.value);
								if (obj.data) {
									var val = $.extend(true, lPage, obj.data);
									if (obj.data.content) {
										val.page = val.content;
									}
								}
								parsePageModel(val, val);

								config.editor.val(config.pageScope.model.page);
								config.editorControl[0].updateFrame();
								config.editorControl[0].disable(false);

							}
						}, {
							method : 'GET'
						}, function (data) {
							if (data == '') {
								parsePageModel();
							}
						});
					}
				} else {
					pageDigest();
				}
			},
			blur : function (leaf) {
				// if (config.editorControl) {
				// config.editorControl[0].$area.insertBefore(editor.$main);
				// config.editorControl[0].$area.removeData("cleditor");
				// config.editorControl[0].$main.remove();
				// }
				parsePageModel();
				config.editor.val('');
				config.editorControl[0].updateFrame();
				config.editorControl[0].disable(true);

			},
			open : function (leaf, controller, tree) {
				pageDigest();
			},
			close : function (leaf, controller) {
				pageDigest();
			},
			deleted : function (leaf) {
				if ((leaf.parent.items.length < 2) && (leaf.parent.els.children.hasClass('ui-sortable'))) {
					leaf.parent.els.children.sortable('destroy');
				}
			},
			added : function (leaf, controller, tree) {
				if ($.fn.draggable && $.fn.droppable) {

					leaf.container.prop('leaf', leaf);
					leaf.els.text
					.prop('leaf', leaf)
					.prop('dropped', null)
					.draggable({
						addClasses : false,
						distance : 11,
						zIndex : 100,
						start : function () {
							leaf.els.text.prop('dropped', tree);
						},
						stop : function () {
							var dropped = leaf.els.text.prop('dropped');
							var revert = false;
							if (dropped) {
								var parent = dropped.parent;
								// config.treeController.blur(function () {
								config.enableFocusHandler = false;
								ajax(config.paths.page.move, function (data) {
									if (data.result) {
										config.pageScope.refresh(leaf.parent, function () {
											config.pageScope.refresh(dropped, function () {
												if (dropped.children[leaf.name]) {
													config.enableFocusHandler = true;
													config.treeController.focus(dropped.children[leaf.name], function () {});
												}
											}, true);
										});
									} else {
										config.pageScope.refresh(leaf.parent, function () {
											config.treeController.focus(leaf);
											config.enableFocusHandler = true;
										});
									}
								}, {
									data : {
										id : leaf.id,
										newParentId : null || dropped.id
									}
								},
									function (response) {
									revert = true;
									info(response.responseText);
									config.enableFocusHandler = true;
								});
								// });
								leaf.els.text.prop('dropped', null);
							}
							if (revert) {
								leaf.els.text.animate({
									top : 0,
									left : 0
								}, 200);
							}
						}
					})
					.droppable({
						addClasses : false,
						accept : 'span.tree_leaf_text',
						drop : function (event, ui) {
							ui.draggable.prop('dropped', leaf);
						}
					});

				}
			}
		}
	};

	if (!ls.get(config.props.pageBorder)) {
		!ls.set(config.props.pageBorder, '300px');
	}
	if (!ls.get(config.props.activeTab)) {
		!ls.set(config.props.activeTab, 'page_head');
	}

	var magnet = null;

	var ActiveTab = null;

	var app = angular.module('fineCutAdm', [])

		.config(['$locationProvider', function ($locationProvider) {
					$locationProvider.hashPrefix('!');
				}
			])

		.config(['$routeProvider', function ($routeProvider) {
					$routeProvider
					.when('/main', {
						templateUrl : './ui/parts/main.html',
						controller : 'MainTabCtrl'
					})
					.when('/notes', {
						templateUrl : './ui/parts/notes.html',
						controller : 'NotesCtrl'
					})
					// .when('files', {
					// templateUrl : './ui/parts/files.html',
					// controller : 'FilesCtrl'
					// })
					.when('/settings', {
						templateUrl : './ui/parts/settings.html',
						controller : 'SettingsCtrl'
					})
					.otherwise({
						redirectTo : '/main'
					});
				}
			])

		.controller('HeadCtrl', ['$scope', function ($scope) {
					$.extend(true, $scope, config.locale.head);
				}
			])

		.controller('BodyCtrl', ['$scope', '$location', function ($scope, $location, $locationProvider) {
					$.extend(true, $scope, {
						i18n : config.locale.body,
						tabs : config.links.main,
						$location : $location,
						activeTab : function () {
							var path = $location.path();
							if (path == '/' + this.tab) {
								ActiveTab = this.tab;
								return 'active';
							} else {
								return '';
							}
						}
					});
					setSizes();
				}
			])

		.controller('MainTabCtrl', ['$scope', function ($scope) {
					$scope.model = {
						base : baseUrl
					};
					$scope.update = function () {
						var base = $scope.model.base;
						if(base){
							debugger;
							ls.set('baseUrl', base);
							baseUrl = ls.get('baseUrl');
							makePaths();
							makeProjects();
						}
					};
				}
			])

		.controller('NotesCtrl', ['$scope', '$location', function ($scope, $location) {
					$.extend(true, $scope, {
						i18n : config.locale.page,
						model : blankPage(),
						treeIsHidden : false,
						$location : $location,
						tabs : $.extend(true, {}, config.links.page),
						add : function () {

							var text = prompt('Leaf name (url).', 'new leaf');
							if (text) {
								var leaf = config.treeController.x.current;
								var path = config.treeController.getPath(leaf);
								var id = '00000000-0000-0000-0000-000000000000';
								var parentId = null;
								parentId = leaf.id;
								var setData = {
									id : id,
									text : text,
									projectId : project,
									parentId : parentId || null
								};
								var requestData = JSON.stringify(setData);
								ajax(config.paths.page.create, function (obj) {
									$scope.refresh(leaf, function () {});
								}, {
									data : requestData,
									async : true
								});
							}

						},
						del : function () {
							var leaf = config.treeController.x.current;
							if (leaf.parent.id) {
								config.treeController.focus(leaf.parent);
							} else {
								config.treeController.blur();
							}
							var requestData = {
								id : leaf.id
							};
							ajax(config.paths.page.del, function (data) {
								$scope.refresh(leaf.parent);
							}, {
								data : requestData,
								method : 'POST',
								async : true
							});
						},
						rename : function () {
							var leaf = config.treeController.x.current;
							var text = prompt('New name?', leaf.text);
							var parent = leaf.parent;
							var oldtext = '' + leaf.text;
							if (text && (text !== '') && (text !== oldtext)) {

								ajax(config.paths.page.rename, function (data) {
									$scope.refresh(parent, function () {
										if (parent.children[leaf.id]) {
											config.treeController.focus(parent.children[leaf.id]);
										}
									});
								}, {
									data : {
										id : leaf.id,
										newName : text
									}
								});

							}
						},
						canRefresh : function () {
							var leaf = config.treeController.x.current;
							if (leaf.folder && leaf.open) {
								return true;
							}
							return false;
						},
						refresh : function (leaf, callback, open) {
							leaf = leaf || config.treeController.x.current;
							config.treeController.refresh(leaf, callback, open);
						},
						save : function (path, callback, modelOpts) {

							var leaf = config.treeController.x.current;
							var model = $.extend(true, blankPage(), ($scope.$$childTail ? $scope.$$childTail.model : $scope.model));

							modelOpts && ($.extend(true, model, modelOpts));

							var setData = {
								content : config.editor.val() || model.page,
								noteId : leaf.id
							};
							ajax(config.paths.page.set, function (obj) {
								if (obj.result) {
									parsePageModel(model, model);
									callback && callback(model.id);
								}
							}, {
								data : setData,
								async : true
							});

						},
						canAdd : function () {
							var leaf = config.treeController.x.current;
							if (leaf.folder && leaf.open == false) {
								return false;
							}
							return true;
						},
						canShare : function () {
							if (magnet) {
								return true;
							}
							return false;
						},
						share : function () {
							parsePageModel(null, magnet);
						},
						getMagnet : function () {
							var model = $.extend(true, {}, ($scope.$$childTail ? $scope.$$childTail.model : $scope.model));
							magnet = model;
						},
						pageIsFocused : function () {
							if (config.treeController.x.current.parent == null) {
								return false;
							}
							return true;
						},
						setActiveTab : function (target) {
							ls.set(config.props.activeTab, target);
						},
						activeTab : function (target) {
							if (ls.get(config.props.activeTab) == target) {
								return 'active';
							}
							return '';
						}
					});
					$('#tree_content, #page_content').height(currentHeight(true, 40));

					window.setTimeout(function () {

						var height = currentHeight(true, 125);
						var editor = $('#editor');
						editor.height(height);
						var editorControl = editor.cleditor({
								height : height
							});
						config.editor = editor;
						config.editorControl = editorControl;
						editorControl[0].disable(true);

					}, 100);

					var tree_content = $('#tree_content');
					config.treeController = tree_content.customTree(treeConfig);
					config.treeController.init();
					config.pageScope = $scope;

					tree_content.css('minWidth', ls.get(config.props.pageBorder));

					var rEl = $('#tree_content_resize');
					var w = 0;
					var dLeft = 0;
					if ($.fn.draggable) {

						rEl.draggable({
							axis : "x",
							distance : 20,
							start : function (ev) {
								dLeft = ev.pageX;
								w = parseInt(tree_content.css('minWidth'));
								var ww = tree_content.width();
								if (ww > w) {
									w = ww;
									tree_content.css('minWidth', ww + 'px');
								}
							},
							drag : function (ev) {},
							stop : function (ev) {
								var diff = dLeft - ev.pageX;
								var end = w;
								if (diff > 0) {
									end = w - diff;
								} else {
									end = w + diff;
								}
								var pw = (w - diff) + 'px';
								tree_content.css('minWidth', pw);
								ls.set(config.props.pageBorder, pw);
								$('#tree_content_resize').css({
									'left' : 0
								});
							}
						});

					} else {

						var dragging = false;
						var draggingoff = false;
						var stopDrag = function () {
							dragging = false;
							draggingoff = false;
							// jqUI $('#container').enableSelection();
						};
						rEl.addClass('unselectable');
						rEl.on('mousedown', function () {
							dragging = true;
							dLeft = rEl.offset().left;
							w = parseInt(tree_content.css('minWidth'));
							var ww = tree_content.width();
							if (ww > w) {
								w = ww;
								tree_content.css('minWidth', ww + 'px');

							}
							// jqUI $('#container').disableSelection();
						})
						.on('mouseup', function () {
							dragging = false;
						})
						.on('mouseout', function () {
							if (dragging) {
								draggingoff = true;
								window.setTimeout(function () {
									if (draggingoff) {
										stopDrag();
									}
								}, 1000);
							}
						})
						.on('mouseover', function () {
							if (draggingoff) {
								dragging = true;
							}
						});
						$(document.body).on('mousemove', function (ev) {
							if (dragging) {
								var diff = dLeft - ev.pageX;
								var end = w;
								if (diff > 0) {
									end = w - diff;
								} else {
									end = w + diff;
								}
								tree_content.css('minWidth', (w - diff) + 'px');
							}
						}).
						on('mouseup', function () {
							if (dragging) {
								stopDrag();
							}
						});

					}

				}
			])

		// .controller('FilesCtrl', ['$scope', function ($scope) {
		// $('#FilesExplorerFrame').height(currentHeight(true));
		// }
		// ])

		.controller('SettingsCtrl', ['$scope', function ($scope) {}
			])
		.directive('ngHover', function () {
			return function (scope, element) {
				element.bind('mouseenter', function () {
					element.addClass('hover');
				}).bind('mouseleave', function () {
					element.removeClass('hover');
				})
			}
		});

	angular.bootstrap($('#ng-app'), ['fineCutAdm']);

	$(window).on('keydown', function (evt) {
		try {
			// Ctrl + S
			if (evt.ctrlKey && evt.keyCode == 83) {

				evt.stopPropagation();
				evt.preventDefault();

				if ((ActiveTab && (ActiveTab == 'notes')) && config.treeController.x.current.parent) {
					config.pageScope.save();
				}

			}
		} catch (e) {
			alert(e);
		}
	});

});
