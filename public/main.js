(function() {
  'use strict';

  var app = angular.module('token-sync', ['firebase']);

  app.directive('contenteditable', function() {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function(scope, element, attributes, ngModel) {
        var setViewValue = function() {
          ngModel.$setViewValue(element.html());
        };

        ngModel.$render = function() {
          element.html(ngModel.$viewValue || '');
        };

        element.bind('blur', function($event) {
          scope.$apply(setViewValue);
        });
      }
    };
  });

  app.controller('TokenSyncController',
    [
      '$scope', '$firebase', '$firebaseAuth', '$firebaseObject',
      function($scope, $firebase, $firebaseAuth, $firebaseObject) {
        function initialize() {
          $scope.roomsRef = firebase.database().ref('rooms');
          $scope.roomOwnersRef = firebase.database().ref('roomOwners');
          $scope.authObj = $firebaseAuth();
          $scope.actionInProgress = false;
        }

        initialize();

        $scope.logIn = function(provider) {
          $scope.actionInProgress = true;
          if (!provider) {
            provider = 'google';
          }
          $scope.authObj.$signInWithPopup(provider).then(function(authData) {
            $scope.authData = authData;
            $scope.getExistingRooms();
          }, function(error) {
             console.error('Login failed: ', error);
          });
        };

        $scope.logOut = function() {
          $scope.actionInProgress = true;
          if ($scope.room) {
            $scope.leaveRoom();
          }
          $scope.existingRooms.$destroy();
          $scope.room = null;
          $scope.inviteCode = null;
          $scope.roomName = null;
          $scope.tokenName = null;
          $scope.newMemberName = null;
          $scope.newMemberTokens = null;
          $scope.authObj.$signOut().then(function() {
            $scope.authData = null;
            $scope.actionInProgress = false;
          });
        };

        $scope.getExistingRooms = function() {
          $scope.actionInProgress = true;
          $scope.userRoomsRef = $scope.roomsRef.child($scope.authData.user.uid);
          $scope.existingRooms = $firebaseObject($scope.userRoomsRef);
          $scope.actionInProgress = false;
        };

        $scope.joinRoomIfExists = function(roomId, callback) {
          var joined = false;
          $scope.actionInProgress = true;

          $scope.roomOwnersRef.child(roomId).once('value', function(owner) {
            if (owner.val() === null) {
              if (callback) {
                callback(false);
              }
              return;
            }

            $scope.roomsRef.child(owner.val().id).once('value', function(snapshot) {
              if (snapshot.val() !== null) {
                $scope.roomRef = $scope.roomsRef.child(owner.val().id).child(roomId);
                $scope.roomObject = $firebaseObject($scope.roomRef);
                $scope.roomObject.$bindTo($scope, 'room');
                joined = true;
              }
              $scope.actionInProgress = false;
              $scope.$apply();
              if (callback) {
                callback(joined);
              }
            });
          });
        };

        $scope.showInviteCode = function() {
          $scope.inviteCode = $scope.room.id;
        };

        $scope.createRoom = function() {
          $scope.actionInProgress = true;
          $scope.roomRef = $scope.roomsRef.child($scope.authData.user.uid).push();
          var room = $firebaseObject($scope.roomRef);
          room.id = $scope.roomRef.key;
          room.name = $scope.roomName;
          room.tokenName = $scope.tokenName;
          room.members = [];
          room.$save();
          $scope.roomOwnersRef.child(room.id).set({
            'id': $scope.authData.user.uid
          });
          $scope.actionInProgress = false;
        };

        $scope.deleteRoom = function () {
          $scope.leaveRoom();
          $scope.roomRef.remove();
        };

        $scope.leaveRoom = function() {
          $scope.roomObject.$destroy();
          $scope.inviteCode = null;
          $scope.room = null;
        };

        $scope.addNewMember = function() {
          if (!$scope.room.members) {
            $scope.room.members = [];
          }
          $scope.room.members.push({
            name: $scope.newMemberName,
            tokens: $scope.newMemberTokens
          });
          $scope.newMemberName = '';
          $scope.newMemberTokens = '';
        };

        $scope.duplicateMember = function(member) {
          $scope.room.members.push({
            name: member.name,
            tokens: member.tokens
          });
        };
      }
    ]
  );
})();
