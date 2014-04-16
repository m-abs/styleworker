/*jshint browser: true */

/*global $, CSSStyleRule */
$( function( ) {
	"use strict";

	var originalRules = {},
	makeArray = function( arr ) {
		return Array.prototype.slice.call( arr, 0 );
	},

	cssDifference = function( data1, data2 ) {
		var
			ret = {
				'added'   : [],
				'removed' : [],
				'diffs'   : {},
				'origs'   : {},
				'current' : data2
			},
			changed = false,
			keys = {};

		if ( !data1 || !data2 ) {
			return false;
		}

		// Find all keys
		[ data1, data2 ].forEach( function( obj ) {
			Object.keys( obj ).forEach( function( key ) {
				keys[ key ] = 1;
			} );
		} );

		Object.keys( keys ).forEach( function( key ) {
			if ( data1[ key ] !== undefined && data2[ key ] === undefined ) {
				ret.removed.push( key );
				changed = true;
			} else if ( data1[ key ] === undefined && data2[ key ] !== undefined ) {
				ret.added.push( key );
				ret.diffs[ key ] = data2[ key ];
				changed = true;
			} else if ( data1[ key ] !== data2[ key ] ) {
				ret.origs[ key ] = data1[ key ];
				ret.diffs[ key ] = data2[ key ];
				changed = true;
			}
		} );

		if ( changed ) {
			return ret;
		}

		return false;
	};

	window.logStyles = function( ) {
		var newRules = {};

		makeArray( document.styleSheets ).forEach( function( styleSheet, idx ) {
			var href = styleSheet.href,
				rules = ( styleSheet.rules || styleSheet.cssRules );
			if ( !href ) {
				return;
			}

			console.log( idx, styleSheet, href );
			if ( !originalRules[ href ] ) {
				originalRules[ href ] = {};
			}

			if ( rules ) {
				makeArray( rules ).forEach( function( rule ) {
					if ( rule.constructor === CSSStyleRule ) {
						var tmpObj = {},
							selectorText = rule.selectorText,
							diffs;

						// The CSSStyleRule-object has all posible css-keys in it's style property,
						// but keys with values are indexed like an array.
						makeArray( rule.style ).forEach( function( key ) {
							tmpObj[ key ] = rule.style[ key ];
						} );

						if ( !originalRules[ href ][ selectorText ] ) {
							originalRules[ href ][ selectorText ] = {};
						}

						if ( !originalRules[ href ][ selectorText ][ idx ] ) {
							originalRules[ href ][ selectorText ][ idx ] = tmpObj;
						} else {
							diffs = cssDifference( originalRules[ href ][ selectorText ][ idx ], tmpObj );
							if ( diffs ) {
								if ( !newRules[ href ] ) {
									newRules[ href ] = {};
								}
								if ( !newRules[ href ][ selectorText ] ) {
									newRules[ href ][ selectorText ] = {};
								}

								if ( !newRules[ href ][ selectorText ][ idx ] ) {
									newRules[ href ][ selectorText ][ idx ] = diffs;
								}
							}
						}
					}
				} );
			}
		} );

		if ( !$.isEmptyObject( newRules ) ) {
			return newRules;
		}
	};

	setTimeout( function() {
		window.logStyles();
	}, 100 );

	window.printDiff = function( ) {
		var output = $( "<div/>" )
			.css( {
				'position' : 'fixed',
				'width' : 400,
				'height' : 400,
				'overflow' : 'auto',
				'top' : '50%',
				'left' : '50%',
				'border' : '1px solid black',
				'background-color' : 'white'
			} )
			.click( function( ) {
				output.fadeOut( function( ) {
					output.remove( );
					output = undefined;
				} );
			} );

		var newRules = window.logStyles( );
		if ( newRules ) {
			Object.keys( newRules ).forEach( function( fileUrl ) {
				var rules = newRules[ fileUrl ],
					content = $( '<div/>' );

				$( "<h2/>" )
					.text( fileUrl )
					.appendTo( output );

				$( "<hr/>" )
					.appendTo( output );

				Object.keys( rules ).forEach( function( selector ) {
					var data = rules[ selector ];

					$( "<h3/>" )
						.text( selector )
						.appendTo( content );

					data.forEach( function( rule ) {
						var ruleBlock = $( '<div/>' ).css( 'min-height', 50 ),
							plain = $( '<div/>' ).css( {
								'min-height' : 50,
								'border' : '1px solid black'
							} ).addClass( 'plain' ),
							changes = $( '<div/>' ).css( {
								'min-height' : 50,
								'border' : '1px solid green'
							} ).addClass( 'changes' ),
							orig = $( '<div/>' ).css( {
								'min-height' : 50,
								'border' : '1px solid blue'
							} ).addClass( 'orig' );

						Object.keys( rule.current ).forEach( function( key ) {
							var value = rule.current[ key ],
								line = $( "<div>" + key + ": " + value + ";" + "</div>" );

							line.clone( )
								.appendTo( plain );

							var changedLine = line.clone( );
							if ( rule.diffs[ key ] ) {
								changedLine.css( {
									'background-color' : 'green'
								} ).attr( {
									'title' : key + ": " + rule.origs[ key ] + ";"
								} );
							}

							changedLine.appendTo( changes );
						} );

						Object.keys( rule.origs ).forEach( function( key ) {
							var value = rule.current[ key ],
								line = $( "<div>" + key + ": " + value + ";" + "</div>" );

							if ( rule.removed[ key ] ) {
								line.css( {
									'background-color' : 'red'
								} ).attr( {
									'title' : 'removed'
								} );
							} else if ( rule.diffs[ key ] ) {
								line.css( {
									'background-color' : 'green'
								} ).attr( {
									'title' : key + ": " + rule.origs[ key ] + ";"
								} );
							}

							line.appendTo( orig );
						} );

						plain.appendTo( ruleBlock );
						changes.appendTo( ruleBlock );
						orig.appendTo( ruleBlock );

						ruleBlock.data( 'plain-el', plain );
						ruleBlock.data( 'changes-el', changes );
						ruleBlock.data( 'orig-el', orig );

						ruleBlock.appendTo( content );
						ruleBlock.data( 'current-offset', -1 );

						ruleBlock.click( function( e ) {
							e.stopPropagation( );
							e.preventDefault( );

							var $this = $( this ),
								curOff = parseInt( ( $this.data( 'current-offset' ) ), 10 ) || 0,
								plain = $this.data( 'plain-el' ),
								changes = $this.data( 'changes-el' ),
								orig = $this.data( 'orig-el' );

							curOff += 1;

							if ( curOff > 2 ) {
								curOff = 0;
							}

							if ( curOff === 0 ) {
								plain.show( );
								changes.hide( );
								orig.hide( );
								console.log( 'show plain' );
							} else if ( curOff === 1 ) {
								plain.hide( );
								changes.show( );
								orig.hide( );
								console.log( 'show changes' );
							} else if ( curOff === 2 ) {
								plain.hide( );
								changes.hide( );
								orig.show( );
								console.log( 'show orig' );
							}

							$this.data( 'current-offset', curOff );
						} ).click();
					} );
				} );

				content.appendTo( output );
			} );

			output.appendTo( document.body );
		} else {
			output.remove( );
			output = undefined;
		}
	};

	setTimeout( function( ) {
		window.printDiff( );
	}, 1000 );

	$( '#wp-calendar' ).load( function( ) {
		console.log( this, arguments );
	} );
} );
