var needsFeedWidth = 350, 
    needsFeedColumnsWidth = 1280,
		needsFeedWindow;

Template.header.events( {
	'click a[href="/needs"]': openNeeds,
    /* JF 2016-04-28 */
	'click a[href="/needscolumns"]': openNeedsColumns
    /* //JF */
    
} );

function openNeeds( event ) {
	if( !isAllowed( 'separate windows' ) ) return;
	event.preventDefault();

	needsFeedWindow = window.open( '/needs', 'needs', 'height=' + window.innerHeight + ',width=' + needsFeedWidth );

	return false;
}

function openNeedsColumns( event ) {
	if( !isAllowed( 'separate windows' ) ) return;
	event.preventDefault();

	needsFeedWindow = window.open( '/needs', 'needs multicolumn', 'height=' + window.innerHeight + ',width=' + needsFeedColumnsWidth );

	return false;
}
