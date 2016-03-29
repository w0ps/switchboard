var needsFeedWidth = 350,
		needsFeedWindow;

Template.header.events( {
	'click a[href="/needs"]': openNeeds
} );

function openNeeds( event ) {
	if( !isAllowed( 'separate windows' ) ) return;
	event.preventDefault();

	needsFeedWindow = window.open( '/needs', 'needs', 'height=' + window.innerHeight + ',width=' + needsFeedWidth );

	return false;
}
