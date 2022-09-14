import React, { useCallback, useState } from "react";
import PropTypes from "prop-types";
import { Button, FloatingLabel, Form, Modal } from "react-bootstrap";
import { stringToMicroAlgos } from "../../utils/conversions";

const ModOptions = ({ createMod, updateFee, modContract }) => {
  const [adoptionFee, setAdoptionFee] = useState(0);

  const isFormFilled = useCallback(() => {
    return adoptionFee > 0;
  }, [adoptionFee]);

  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const [show1, setShow1] = useState(false);
  const handleClose1 = () => setShow1(false);
  const handleShow1 = () => setShow1(true);

  return (
    <>
      <Button
        onClick={handleShow1}
        variant="dark"
        className="rounded-pill px-0"
        style={{ width: "38px" }}
      >
        <i className="bi bi-cash-coin"></i>
      </Button>

      {Number(modContract.adoptFee) > 0 ? (
        <> </>
      ) : (
        <Button
          onClick={handleShow}
          variant="dark"
          className="rounded-pill px-0"
          style={{ width: "38px" }}
        >
          <i className="bi bi-file-earmark-plus-fill"></i>
        </Button>
      )}
      {/* MOD CONTRACT MODAL */}
      <Modal show={show} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create Mod Contract</Modal.Title>
        </Modal.Header>
        <Form>
          <Modal.Body>
            <FloatingLabel
              controlId="inputPrice"
              label="Fee in ALGO"
              className="mb-3"
            >
              <Form.Control
                type="text"
                placeholder="Adoption Fee"
                onChange={(e) => {
                  setAdoptionFee(stringToMicroAlgos(e.target.value));
                }}
              />
            </FloatingLabel>
          </Modal.Body>
        </Form>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={handleClose}>
            Close
          </Button>
          <Button
            variant="dark"
            disabled={!isFormFilled()}
            onClick={async () => {
              try {
                await createMod(adoptionFee);
                handleClose();
              } catch (error) {
                console.log(error);
              }
            }}
          >
            New Mod
          </Button>
        </Modal.Footer>
      </Modal>

      {/* UPDATE FEE MODAL */}
      <Modal show={show1} onHide={handleClose1} centered>
        <Modal.Header closeButton>
          <Modal.Title>Update Pet Shop Fee</Modal.Title>
        </Modal.Header>
        <Form>
          <Modal.Body>
            <FloatingLabel
              controlId="inputPrice"
              label="Fee in ALGO"
              className="mb-3"
            >
              <Form.Control
                type="text"
                placeholder="Adoption Fee"
                onChange={(e) => {
                  setAdoptionFee(stringToMicroAlgos(e.target.value));
                }}
              />
            </FloatingLabel>
          </Modal.Body>
        </Form>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={handleClose}>
            Close
          </Button>
          <Button
            variant="dark"
            disabled={!isFormFilled()}
            onClick={async () => {
              try {
                await updateFee(adoptionFee);
                handleClose();
              } catch (error) {
                console.log(error);
              }
            }}
          >
            Update Fee
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};
ModOptions.propTypes = {
  createMod: PropTypes.func.isRequired,
  updateFee: PropTypes.func.isRequired,
};

export default ModOptions;
