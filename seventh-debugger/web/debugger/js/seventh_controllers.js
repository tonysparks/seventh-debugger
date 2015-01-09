
var seventhDebugger = angular.module('seventhDebugger', []);

seventhDebugger.controller('BrainsCtrl', function ($scope) {

	$scope.updateAI = function(ai) {		
		var brains = []
		for(var i = 0; i < ai.brains.length; i++ ) {
			var b = ai.brains[i];
			if (b==null) {
				brains[i] = {
					entity_id: i,					
					thoughts: null,
					locomotion: null					
				}
			}
			else 
			{
				brains[i] = {
					entity_id: JSON.stringify(b.entity_id),					
					thoughts: b.thoughts,
					locomotion: b.locomotion
				}		
			}
		}

		$scope.brains = brains;
		$scope.$apply();
	}
});