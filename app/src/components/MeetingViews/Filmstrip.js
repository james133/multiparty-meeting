import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import classnames from 'classnames';
import {
	spotlightsLengthSelector
} from '../Selectors';
import { withRoomContext } from '../../RoomContext';
import Me from '../Containers/Me';
import Peer from '../Containers/Peer';
import SpeakerPeer from '../Containers/SpeakerPeer';
import HiddenPeers from '../Containers/HiddenPeers';
import Grid from '@material-ui/core/Grid';

const styles = () =>
	({
		root :
		{
			height              : '100%',
			width               : '100%',
			display             : 'grid',
			gridTemplateColumns : '1fr',
			gridTemplateRows    : '1.6fr minmax(0, 0.4fr)'
		},
		speaker :
		{
			gridArea       : '1 / 1 / 2 / 2',
			display        : 'flex',
			justifyContent : 'center',
			alignItems     : 'center',
			paddingTop     : 40
		},
		filmStrip :
		{
			gridArea : '2 / 1 / 3 / 2'
		},
		filmItem :
		{
			display      : 'flex',
			marginLeft   : '6px',
			border       : 'var(--peer-border)',
			'&.selected' :
			{
				borderColor : 'var(--selected-peer-border-color)'
			},
			'&.active' :
			{
				opacity : '0.6'
			}
		}
	});

class Filmstrip extends React.PureComponent
{
	constructor(props)
	{
		super(props);

		this.resizeTimeout = null;

		this.activePeerContainer = React.createRef();
	}

	state = {
		lastSpeaker : null
	};

	// Find the name of the peer which is currently speaking. This is either
	// the latest active speaker, or the manually selected peer, or, if no
	// person has spoken yet, the first peer in the list of peers.
	getActivePeerId = () =>
	{
		const {
			selectedPeerId,
			peers
		} = this.props;

		const { lastSpeaker } = this.state;

		if (selectedPeerId && peers[selectedPeerId])
		{
			return this.props.selectedPeerId;
		}

		if (lastSpeaker && peers[lastSpeaker])
		{
			return this.state.lastSpeaker;
		}

		const peerIds = Object.keys(peers);

		if (peerIds.length > 0)
		{
			return peerIds[0];
		}
	};

	isSharingCamera = (peerId) => this.props.peers[peerId] &&
		this.props.peers[peerId].consumers.some((consumer) =>
			this.props.consumers[consumer].source === 'screen');

	updateDimensions = () =>
	{
		const container = this.activePeerContainer.current;

		if (container)
		{
			let width = (container.clientWidth - 100);

			let height = (width / 4) * 3;

			if (this.isSharingCamera(this.getActivePeerId()))
			{
				width /= 2;
				height = (width / 4) * 3;
			}

			if (height > (container.clientHeight - 60))
			{
				height = (container.clientHeight - 60);
				width = (height / 3) * 4;
			}

			this.setState({
				width,
				height
			});
		}
	};

	componentDidMount()
	{
		// window.resize event listener
		window.addEventListener('resize', () =>
		{
			// clear the timeout
			clearTimeout(this.resizeTimeout);

			// start timing for event "completion"
			this.resizeTimeout = setTimeout(() => this.updateDimensions(), 250);
		});

		this.updateDimensions();
	}

	componentWillUnmount()
	{
		window.removeEventListener('resize', this.updateDimensions);
	}

	componentWillUpdate(nextProps)
	{
		if (nextProps !== this.props)
		{
			if (
				nextProps.activeSpeakerId != null &&
				nextProps.activeSpeakerId !== this.props.myId
			)
			{
				// eslint-disable-next-line react/no-did-update-set-state
				this.setState({
					lastSpeaker : nextProps.activeSpeakerId
				});
			}
		}
	}

	componentDidUpdate(prevProps)
	{
		if (prevProps !== this.props)
		{
			this.updateDimensions();
		}
	}

	render()
	{
		const {
			roomClient,
			peers,
			myId,
			advancedMode,
			spotlights,
			spotlightsLength,
			classes
		} = this.props;

		const activePeerId = this.getActivePeerId();

		const speakerStyle =
		{
			width  : this.state.width,
			height : this.state.height
		};

		const peerStyle =
		{
			'width'  : '24vmin',
			'height' : '18vmin'
		};

		return (
			<div className={classes.root}>
				<div className={classes.speaker} ref={this.activePeerContainer}>
					{ peers[activePeerId] ?
						<SpeakerPeer
							advancedMode={advancedMode}
							id={activePeerId}
							style={speakerStyle}
						/>
						:null
					}
				</div>

				<div className={classes.filmStrip}>
					<Grid container justify='center' spacing={0}>
						<Grid item>
							<div
								className={classnames(classes.filmItem, {
									active : myId === activePeerId
								})}
							>
								<Me
									advancedMode={advancedMode}
									style={peerStyle}
								/>
							</div>
						</Grid>

						{ Object.keys(peers).map((peerId) =>
						{
							if (spotlights.find((spotlightsElement) => spotlightsElement === peerId))
							{
								return (
									<Grid key={peerId} item>
										<div
											key={peerId}
											onClick={() => roomClient.setSelectedPeer(peerId)}
											className={classnames(classes.filmItem, {
												selected : this.props.selectedPeerId === peerId,
												active   : peerId === activePeerId
											})}
										>
											<Peer
												advancedMode={advancedMode}
												id={peerId}
												style={peerStyle}
											/>
										</div>
									</Grid>
								);
							}
							else
							{
								return ('');
							}
						})}
					</Grid>
				</div>
				<div className={classes.hiddenPeers}>
					{ spotlightsLength<Object.keys(peers).length ?
						<HiddenPeers
							hiddenPeersCount={Object.keys(peers).length-spotlightsLength}
						/>
						:null
					}
				</div>
			</div>
		);
	}
}

Filmstrip.propTypes = {
	roomClient       : PropTypes.any.isRequired,
	activeSpeakerId  : PropTypes.string,
	advancedMode     : PropTypes.bool,
	peers            : PropTypes.object.isRequired,
	consumers        : PropTypes.object.isRequired,
	myId             : PropTypes.string.isRequired,
	selectedPeerId   : PropTypes.string,
	spotlightsLength : PropTypes.number,
	spotlights       : PropTypes.array.isRequired,
	classes          : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		activeSpeakerId  : state.room.activeSpeakerId,
		selectedPeerId   : state.room.selectedPeerId,
		peers            : state.peers,
		consumers        : state.consumers,
		myId             : state.me.id,
		spotlights       : state.room.spotlights,
		spotlightsLength : spotlightsLengthSelector(state)
	};
};

export default withRoomContext(connect(
	mapStateToProps,
	null,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.room.activeSpeakerId === next.room.activeSpeakerId &&
				prev.room.selectedPeerId === next.room.selectedPeerId &&
				prev.peers === next.peers &&
				prev.consumers === next.consumers &&
				prev.room.spotlights === next.room.spotlights &&
				prev.me.id === next.me.id
			);
		}
	}
)(withStyles(styles)(Filmstrip)));