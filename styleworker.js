$( function( ) {
	"use strict";

	var cssDifference = function( data1, data2 ) {
		var ret = {
			'new' : [],
			'removed' : [],
			'diffs' : {},
			'origs' : {},
			'current' : data2
		},
			changed = false,
			keys = {};

		if ( !data1 || !data2 ) {
			return false;
		}

		// Find all keys
		for ( var key in data1 ) {
			if ( !keys[ key ] ) {
				keys[ key ] = 1;
			}
		}

		for ( var key in data2 ) {
			if ( !keys[ key ] ) {
				keys[ key ] = 1;
			}
		}

		for ( var key in keys ) {
			if ( data1[ key ] !== undefined && data2[ key ] === undefined ) {
				ret[ 'removed' ].push( key );
				changed = true;
			} else if ( data1[ key ] === undefined && data2[ key ] !== undefined ) {
				ret[ 'new' ].push( key );
				ret[ 'diffs' ][ key ] = data2[ key ];
				changed = true;
			} else if ( data1[ key ] !== data2[ key ] ) {
				ret[ 'origs' ][ key ] = data1[ key ];
				ret[ 'diffs' ][ key ] = data2[ key ];
				changed = true;
			}
		}

		if ( changed ) {
			return ret;
		}

		return false;
	};

	var originalRules = {};

	window.logStyles = function( ) {
		var newRules = {};
	
		$.each( document.styleSheets, function( idx, styleSheet ) {
			if ( !originalRules[ styleSheet.href ] ) {
				originalRules[ styleSheet.href ] = {};
			}
	
			var rules = ( styleSheet.rules || styleSheet.cssRules );
			if ( rules && styleSheet.href ) {
				$.each( rules, function( idx2, rule ) {
					if ( rule.constructor === CSSStyleRule ) {
						var tmpObj = {},
							diffs;
	
						for ( var i = 0; i < rule.style.length; i += 1 ) {
							var key = rule.style[ i ],
								val = rule.style[ key ];
	
							tmpObj[ key ] = val;
						}
	
						if ( !originalRules[ styleSheet.href ][ rule.selectorText ] ) {
							originalRules[ styleSheet.href ][ rule.selectorText ] = {};
						}
	
						if ( !originalRules[ styleSheet.href ][ rule.selectorText ][ idx ] ) {
							originalRules[ styleSheet.href ][ rule.selectorText ][ idx ] = tmpObj;
						} else {
							diffs = cssDifference( originalRules[ styleSheet.href ][ rule.selectorText ][ idx ], tmpObj );
							if ( diffs ) {
								if ( !newRules[ styleSheet.href ] ) {
									newRules[ styleSheet.href ] = {};
								}
								if ( !newRules[ styleSheet.href ][ rule.selectorText ] ) {
									newRules[ styleSheet.href ][ rule.selectorText ] = {};
								}
	
								if ( !newRules[ styleSheet.href ][ rule.selectorText ][ idx ] ) {
									newRules[ styleSheet.href ][ rule.selectorText ][ idx ] = diffs;
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
			$.each( newRules, function( fileUrl, rules ) {
				$( "<h2/>" )
					.text( fileUrl )
					.appendTo( output );

				$( "<hr/>" )
					.appendTo( output );
				
				var content = $( '<div/>' );
				$.each( rules, function( selector, data ) {
					$( "<h3/>" )
						.text( selector )
						.appendTo( content );

					$.each( data, function( idx, rule ) {
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

						$.each( rule.current, function( key, value ) {
							var line = $( "<div>" + key + ":" + value + ";" + "</div>" );

							line.clone( )
								.appendTo( plain );

							var changedLine = line.clone( );
							if ( rule.diffs[ key ] ) {
								changedLine.css( {
									'background-color' : 'green'
								} ).attr( {
									'title' : key + ":" + rule.origs[ key ] + ";"
								} );
							}

							changedLine.appendTo( changes );
						} );

						$.each( rule.origs, function( key, value ) {
							var line = $( "<div>" + key + ":" + value + ";" + "</div>" );

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
									'title' : key + ":" + rule.origs[ key ] + ";"
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
});
