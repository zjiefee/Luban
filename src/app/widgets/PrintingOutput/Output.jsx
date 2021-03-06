import React, { PureComponent } from 'react';
import Select from 'react-select';
import { connect } from 'react-redux';
import path from 'path';
import jQuery from 'jquery';
import PropTypes from 'prop-types';
import FileSaver from 'file-saver';

import { pathWithRandomSuffix } from '../../../shared/lib/random-utils';
import i18n from '../../lib/i18n';
import modal from '../../lib/modal';
import { actions as printingActions, PRINTING_STAGE } from '../../flux/printing';
import { actions as workspaceActions } from '../../flux/workspace';
import Thumbnail from './Thumbnail';
import ModelExporter from '../PrintingVisualizer/ModelExporter';


class Output extends PureComponent {
    static propTypes = {
        setTitle: PropTypes.func.isRequired,
        minimized: PropTypes.bool.isRequired,

        modelGroup: PropTypes.object.isRequired,
        boundingBox: PropTypes.object.isRequired,
        isGcodeOverstepped: PropTypes.bool.isRequired,
        workflowState: PropTypes.string.isRequired,
        gcodeLine: PropTypes.object,
        gcodePath: PropTypes.string.isRequired,
        hasModel: PropTypes.bool.isRequired,
        stage: PropTypes.number.isRequired,
        isAnyModelOverstepped: PropTypes.bool.isRequired,
        generateGcode: PropTypes.func.isRequired,
        addGcode: PropTypes.func.isRequired,
        addGcodeFile: PropTypes.func.isRequired,
        clearGcode: PropTypes.func.isRequired
    };

    state = {
        exportModelFormatInfo: 'stl_binary'
    };

    thumbnail = React.createRef();

    actions = {
        onClickGenerateGcode: () => {
            const thumbnail = this.thumbnail.current.getThumbnail();
            this.props.generateGcode(thumbnail);
        },
        onClickLoadGcode: () => {
            if (this.props.isGcodeOverstepped) {
                modal({
                    title: 'Warning',
                    body: 'Generated G-code overstepped out of the cube, please modify your model and re-generate G-code.'
                });
                return;
            }

            const gcodePath = this.props.gcodePath;
            document.location.href = '/#/workspace';
            window.scrollTo(0, 0);
            const filename = path.basename(gcodePath);
            jQuery.get(gcodePath, (result) => {
                this.props.clearGcode();
                this.props.addGcode(filename, result);

                this.props.addGcodeFile({
                    name: filename,
                    uploadName: filename,
                    size: result.length,
                    lastModifiedDate: new Date(),
                    img: this.thumbnail.current.getDataURL()
                });
            });
        },
        onClickExportGcode: () => {
            if (this.props.isGcodeOverstepped) {
                modal({
                    title: 'Warning',
                    body: 'Generated G-code overstepped out of the cube, please modify your model and re-generate G-code.'
                });
                return;
            }
            const gcodePath = this.props.gcodePath;
            const filename = path.basename(gcodePath);
            jQuery.get(gcodePath, (data) => {
                const blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
                const savedFilename = pathWithRandomSuffix(filename);
                FileSaver.saveAs(blob, savedFilename, true);
            });
        },
        onChangeExportModelFormat: (option) => {
            this.setState({
                exportModelFormatInfo: option.value
            });
        },
        onClickExportModel: () => {
            const infos = this.state.exportModelFormatInfo.split('_');
            const format = infos[0];
            const isBinary = (infos.length > 1) ? (infos[1] === 'binary') : false;
            // const output = new ModelExporter().parse(this.props.modelGroup, format, isBinary);
            const output = new ModelExporter().parse(this.props.modelGroup.object, format, isBinary);
            if (!output) {
                // export error
                return;
            }
            const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
            let fileName = 'export';
            if (format === 'stl') {
                if (isBinary === true) {
                    fileName += '_binary';
                } else {
                    fileName += '_ascii';
                }
            }
            fileName += `.${format}`;
            FileSaver.saveAs(blob, fileName, true);
        }
    };

    constructor(props) {
        super(props);
        this.props.setTitle(i18n._('Output'));
    }

    render() {
        const state = this.state;
        const actions = this.actions;
        const { workflowState, stage, gcodeLine, hasModel } = this.props;

        const isSlicing = stage === PRINTING_STAGE.SLICING;
        const { isAnyModelOverstepped } = this.props;

        return (
            <div>
                <div>
                    <button
                        type="button"
                        className="sm-btn-large sm-btn-default"
                        onClick={actions.onClickGenerateGcode}
                        disabled={!hasModel || isSlicing || isAnyModelOverstepped}
                        style={{ display: 'block', width: '100%' }}
                    >
                        {i18n._('Generate G-code')}
                    </button>
                    <table style={{ width: '100%', marginTop: '10px' }}>
                        <tbody>
                            <tr>
                                <td style={{ paddingLeft: '0px', width: '60%' }}>
                                    <Select
                                        clearable={false}
                                        options={[{
                                            value: 'stl_binary',
                                            label: i18n._('STL File (Binary) (*.stl)')
                                        }, {
                                            value: 'stl_ascii',
                                            label: i18n._('STL File (ASCII) (*.stl)')
                                        }, {
                                            value: 'obj',
                                            label: i18n._('OBJ File (*.obj)')
                                        }]}
                                        value={state.exportModelFormatInfo}
                                        searchable={false}
                                        onChange={actions.onChangeExportModelFormat}
                                    />
                                </td>
                                <td style={{ paddingRight: '0px', width: '40%' }}>
                                    <button
                                        type="button"
                                        className="sm-btn-large sm-btn-default"
                                        style={{ width: '100%' }}
                                        disabled={!hasModel}
                                        onClick={actions.onClickExportModel}
                                    >
                                        {i18n._('Export Models')}
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <button
                        type="button"
                        className="sm-btn-large sm-btn-default"
                        onClick={actions.onClickLoadGcode}
                        disabled={workflowState === 'running' || !gcodeLine}
                        style={{ display: 'block', width: '100%', marginTop: '10px' }}
                    >
                        {i18n._('Load G-code to Workspace')}
                    </button>
                    <button
                        type="button"
                        className="sm-btn-large sm-btn-default"
                        onClick={actions.onClickExportGcode}
                        disabled={!gcodeLine}
                        style={{ display: 'block', width: '100%', marginTop: '10px' }}
                    >
                        {i18n._('Export G-code to file')}
                    </button>
                </div>
                <Thumbnail
                    ref={this.thumbnail}
                    modelGroup={this.props.modelGroup}
                    boundingBox={this.props.boundingBox}
                    minimized={this.props.minimized}
                />
            </div>
        );
    }
}

const mapStateToProps = (state) => {
    const printing = state.printing;
    const { workflowState } = state.machine;
    const {
        stage,
        modelGroup, hasModel, boundingBox, isAnyModelOverstepped,
        isGcodeOverstepped, gcodeLine, gcodePath
    } = printing;

    return {
        workflowState,
        stage,
        modelGroup,
        boundingBox,
        hasModel,
        isAnyModelOverstepped,
        isGcodeOverstepped,
        gcodeLine,
        gcodePath
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        generateGcode: (thumbnail) => dispatch(printingActions.generateGcode(thumbnail)),
        addGcode: (name, gcode, renderMethod) => dispatch(workspaceActions.addGcode(name, gcode, renderMethod)),
        addGcodeFile: (fileInfo) => dispatch(workspaceActions.addGcodeFile(fileInfo)),
        clearGcode: () => dispatch(workspaceActions.clearGcode())
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(Output);
